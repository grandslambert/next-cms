import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [roles] = await db.query<RowDataPacket[]>(
      'SELECT id, name, display_name, description, permissions, is_system, created_at, updated_at FROM roles WHERE id = ?',
      [params.id]
    );

    if (roles.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const role = roles[0];
    role.permissions = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;

    return NextResponse.json({ role });
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json({ error: 'Failed to fetch role' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if role is a system role
    const [existingRoles] = await db.query<RowDataPacket[]>(
      'SELECT name, display_name, description, permissions, is_system, site_id FROM roles WHERE id = ?',
      [params.id]
    );

    if (existingRoles.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Prevent editing super admin role
    if (existingRoles[0].name === 'super_admin') {
      return NextResponse.json({ error: 'Super Administrator role cannot be modified' }, { status: 403 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    const currentSiteId = (session.user as any)?.currentSiteId || 1;

    const body = await request.json();
    const { name, display_name, description, permissions } = body;

    // Get role data before update for logging
    const beforeChanges = {
      name: existingRoles[0].name,
      display_name: existingRoles[0].display_name,
      description: existingRoles[0].description,
      permissions: existingRoles[0].permissions,
    };

    // Super admins editing system roles or global roles: update global role (affects all sites without overrides)
    if ((existingRoles[0].is_system || !existingRoles[0].site_id) && isSuperAdmin) {
      if (!permissions) {
        return NextResponse.json({ error: 'Missing permissions' }, { status: 400 });
      }

      await db.query<ResultSetHeader>(
        'UPDATE roles SET permissions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(permissions), params.id]
      );
    } 
    // Site admins editing system roles: create/update override (only affects their site)
    else if (existingRoles[0].is_system && !isSuperAdmin) {
      if (!permissions) {
        return NextResponse.json({ error: 'Missing permissions' }, { status: 400 });
      }

      // Create or update override for this site
      await db.query<ResultSetHeader>(
        `INSERT INTO site_role_overrides (site_id, role_id, permissions)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE permissions = VALUES(permissions), updated_at = CURRENT_TIMESTAMP`,
        [currentSiteId, params.id, JSON.stringify(permissions)]
      );
    } 
    // Editing custom roles (site-specific or global custom)
    else {
      if (!name || !display_name || !permissions) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      await db.query<ResultSetHeader>(
        'UPDATE roles SET name = ?, display_name = ?, description = ?, permissions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, display_name, description || null, JSON.stringify(permissions), params.id]
      );
    }

    // Get updated role for logging
    const [updatedRole] = await db.query<RowDataPacket[]>(
      'SELECT * FROM roles WHERE id = ?',
      [params.id]
    );

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'role_updated',
      entityType: 'role',
      entityId: Number.parseInt(params.id),
      entityName: updatedRole[0].display_name,
      details: `Updated role: ${updatedRole[0].display_name} (${updatedRole[0].name})`,
      changesBefore: beforeChanges,
      changesAfter: {
        name: updatedRole[0].name,
        display_name: updatedRole[0].display_name,
        description: updatedRole[0].description,
        permissions: updatedRole[0].permissions,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    // Check if the current user's role was edited
    const currentUserRoleId = (session.user as any).roleId;
    const shouldUpdateSession = currentUserRoleId === Number.parseInt(params.id);

    return NextResponse.json({ 
      success: true,
      shouldUpdateSession,
      role: {
        ...updatedRole[0],
        permissions: JSON.parse(updatedRole[0].permissions)
      }
    });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;

    // Check if role is a system role
    const [roles] = await db.query<RowDataPacket[]>(
      'SELECT name, display_name, is_system, site_id FROM roles WHERE id = ?',
      [params.id]
    );

    if (roles.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (roles[0].is_system) {
      return NextResponse.json({ error: 'Cannot delete system role' }, { status: 403 });
    }

    // Prevent super admins from deleting site-specific roles
    if (isSuperAdmin && roles[0].site_id) {
      return NextResponse.json({ 
        error: 'Site-specific roles can only be deleted by site administrators' 
      }, { status: 403 });
    }

    // Check if any users have this role
    const [users] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM users WHERE role_id = ?',
      [params.id]
    );

    if (users[0].count > 0) {
      return NextResponse.json({ 
        error: `Cannot delete role: ${users[0].count} user(s) are assigned to this role` 
      }, { status: 400 });
    }

    // Log activity before deleting
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'role_deleted',
      entityType: 'role',
      entityId: Number.parseInt(params.id),
      entityName: roles[0].display_name,
      details: `Deleted role: ${roles[0].display_name} (${roles[0].name})`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    await db.query<ResultSetHeader>(
      'DELETE FROM roles WHERE id = ?',
      [params.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}


