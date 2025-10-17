import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getSiteTable } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import { validatePassword } from '@/lib/password-validator';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    const currentSiteId = (session.user as any)?.currentSiteId || 1;

    let rows: RowDataPacket[];

    if (isSuperAdmin) {
      // Super admin sees all users with their site assignments
      const [allUsers] = await db.query<RowDataPacket[]>(
        `SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.role_id, 
                r.name as role_name, r.display_name as role_display_name, 
                u.created_at, u.updated_at 
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         ORDER BY u.created_at DESC`
      );
      
      // Fetch site assignments for each user
      for (const user of allUsers) {
        const [siteAssignments] = await db.query<RowDataPacket[]>(
          `SELECT s.id, s.name, s.display_name, su.role_id, r.display_name as role_display_name
           FROM site_users su
           JOIN sites s ON su.site_id = s.id
           LEFT JOIN roles r ON su.role_id = r.id
           WHERE su.user_id = ?
           ORDER BY s.name ASC`,
          [user.id]
        );
        (user as any).sites = siteAssignments;
      }
      
      rows = allUsers;
    } else {
      // Site admins only see users assigned to their current site
      const [siteUsers] = await db.query<RowDataPacket[]>(
        `SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.role_id, 
                r.name as role_name, r.display_name as role_display_name, 
                u.created_at, u.updated_at 
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         INNER JOIN site_users su ON u.id = su.user_id
         WHERE su.site_id = ?
         ORDER BY u.created_at DESC`,
        [currentSiteId]
      );
      rows = siteUsers;
    }

    return NextResponse.json({ users: rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin || false;
    const hasPermission = (session?.user as any)?.permissions?.manage_users || false;
    
    if (!session?.user || (!isSuperAdmin && !hasPermission)) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await request.json();
    const { username, first_name, last_name, email, password, role_id } = body;

    if (!username || !first_name || !email || !password || role_id === undefined || role_id === null) {
      return NextResponse.json({ error: 'Username, first name, email, password, and role are required' }, { status: 400 });
    }

    // Get site ID for multi-site support
    const siteId = (session.user as any).currentSiteId || 1;
    const settingsTable = getSiteTable(siteId, 'settings');

    // Fetch password requirements
    const [pwSettings] = await db.query<RowDataPacket[]>(
      `SELECT setting_key, setting_value FROM ${settingsTable} 
       WHERE setting_key IN (
         'password_min_length',
         'password_require_uppercase',
         'password_require_lowercase',
         'password_require_numbers',
         'password_require_special'
       )`
    );

    const requirements = {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecial: false,
    };

    for (const setting of pwSettings) {
      const value = setting.setting_value;
      switch (setting.setting_key) {
        case 'password_min_length':
          requirements.minLength = Number.parseInt(value) || 8;
          break;
        case 'password_require_uppercase':
          requirements.requireUppercase = value === '1';
          break;
        case 'password_require_lowercase':
          requirements.requireLowercase = value === '1';
          break;
        case 'password_require_numbers':
          requirements.requireNumbers = value === '1';
          break;
        case 'password_require_special':
          requirements.requireSpecial = value === '1';
          break;
      }
    }

    // Validate password
    const validation = validatePassword(password, requirements);
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'Password does not meet requirements', 
        details: validation.errors 
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO users (username, first_name, last_name, email, password, role_id) VALUES (?, ?, ?, ?, ?, ?)',
      [username, first_name, last_name || '', email, hashedPassword, role_id]
    );

    const newUserId = result.insertId;

    // If not super admin, automatically assign the new user to the current site
    if (!isSuperAdmin) {
      await db.query<ResultSetHeader>(
        'INSERT INTO site_users (site_id, user_id, role_id) VALUES (?, ?, ?)',
        [siteId, newUserId, role_id]
      );
    }

    const [newUser] = await db.query<RowDataPacket[]>(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.role_id,
              r.name as role_name, r.display_name as role_display_name, u.created_at 
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [newUserId]
    );

    // Log activity
    const currentUserId = (session.user as any).id;
    const siteAssignmentText = isSuperAdmin ? '' : ` and assigned to site ${siteId}`;
    await logActivity({
      userId: currentUserId,
      action: 'user_created',
      entityType: 'user',
      entityId: newUserId,
      entityName: username,
      details: `Created user: ${username} (${first_name} ${last_name})${siteAssignmentText}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ user: newUser[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A user with this username or email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

