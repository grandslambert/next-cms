import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    const currentSiteId = (session.user as any)?.currentSiteId || 1;
    
    let query = `SELECT r.id, r.name, r.display_name, r.description, 
                 COALESCE(sro.permissions, r.permissions) as permissions,
                 r.is_system, r.site_id, 
                 s.display_name as site_name,
                 IF(sro.id IS NOT NULL, 1, 0) as has_override,
                 r.created_at, r.updated_at 
                 FROM roles r
                 LEFT JOIN sites s ON r.site_id = s.id
                 LEFT JOIN site_role_overrides sro ON r.id = sro.role_id AND sro.site_id = ?`;
    let params: any[] = [isSuperAdmin ? 0 : currentSiteId]; // Super admins: don't load overrides
    
    if (!isSuperAdmin) {
      // Site admins see: system roles (with overrides if they exist) + their site's custom roles
      query += ' WHERE r.site_id IS NULL OR r.site_id = ?';
      params.push(currentSiteId);
    } else {
      // Super admins see all roles without overrides
      query += ' WHERE 1=1'; // Dummy condition since we're already excluding overrides with site_id = 0
    }
    
    query += ' ORDER BY r.site_id IS NULL DESC, r.id ASC'; // System roles first, then site-specific

    const [roles] = await db.query<RowDataPacket[]>(query, params);

    // Parse JSON permissions
    const rolesWithParsedPermissions = roles.map(role => ({
      ...role,
      permissions: typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions,
      has_override: !!role.has_override
    }));

    return NextResponse.json({ roles: rolesWithParsedPermissions });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, display_name, description, permissions } = body;

    if (!name || !display_name || !permissions) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    const currentSiteId = (session.user as any)?.currentSiteId || 1;
    
    // Site admins can only create roles for their site
    // Super admins can create global roles (site_id = NULL)
    const site_id = isSuperAdmin ? null : currentSiteId;

    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO roles (name, display_name, description, permissions, is_system, site_id) VALUES (?, ?, ?, ?, false, ?)',
      [name, display_name, description || null, JSON.stringify(permissions), site_id]
    );

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'role_created',
      entityType: 'role',
      entityId: result.insertId,
      entityName: display_name,
      details: `Created ${site_id ? 'site-specific' : 'global'} role: ${display_name} (${name})`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId: site_id,
    });

    return NextResponse.json({ 
      id: result.insertId,
      name,
      display_name,
      description,
      permissions,
      is_system: false,
      site_id
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}


