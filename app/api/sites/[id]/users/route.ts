import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    // Get all users assigned to this site with their roles
    const [siteUsers] = await db.query<RowDataPacket[]>(
      `SELECT 
        su.id,
        su.user_id,
        su.role_id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        r.name as role_name,
        r.display_name as role_display_name,
        su.created_at
       FROM site_users su
       INNER JOIN users u ON su.user_id = u.id
       INNER JOIN roles r ON su.role_id = r.id
       WHERE su.site_id = ?
       ORDER BY u.username ASC`,
      [params.id]
    );

    return NextResponse.json({ users: siteUsers });
  } catch (error) {
    console.error('Error fetching site users:', error);
    return NextResponse.json({ error: 'Failed to fetch site users' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    const { user_id, role_id } = await request.json();

    if (!user_id || role_id === undefined || role_id === null) {
      return NextResponse.json({ error: 'User ID and role ID are required' }, { status: 400 });
    }

    // Check if site exists
    const [sites] = await db.query<RowDataPacket[]>(
      'SELECT id, display_name FROM sites WHERE id = ?',
      [params.id]
    );

    if (sites.length === 0) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Check if user exists
    const [users] = await db.query<RowDataPacket[]>(
      'SELECT id, username FROM users WHERE id = ?',
      [user_id]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is already assigned to this site
    const [existing] = await db.query<RowDataPacket[]>(
      'SELECT id FROM site_users WHERE site_id = ? AND user_id = ?',
      [params.id, user_id]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: 'User is already assigned to this site' }, { status: 409 });
    }

    // Add user to site
    const [result] = await db.execute<ResultSetHeader>(
      'INSERT INTO site_users (site_id, user_id, role_id) VALUES (?, ?, ?)',
      [params.id, user_id, role_id]
    );

    // Get role info for logging
    const [roles] = await db.query<RowDataPacket[]>(
      'SELECT display_name FROM roles WHERE id = ?',
      [role_id]
    );

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'site_user_added' as any,
      entityType: 'site' as any,
      entityId: Number.parseInt(params.id),
      entityName: sites[0].display_name,
      details: `Added user ${users[0].username} to site ${sites[0].display_name} as ${roles[0]?.display_name || 'unknown role'}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ 
      success: true,
      id: result.insertId,
      message: 'User added to site successfully'
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding user to site:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'User is already assigned to this site' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to add user to site' }, { status: 500 });
  }
}

