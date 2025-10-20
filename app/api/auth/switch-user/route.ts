import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

// Switch to another user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    const userRole = (session.user as any)?.role;
    
    // Only super admins and admins can switch users
    if (!isSuperAdmin && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    // Get target user details
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT u.*, r.name as role_name, r.permissions 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [targetUserId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const targetUser = rows[0];

    // Prevent switching to another super admin (for security)
    if (targetUser.role_name === 'super_admin' && !isSuperAdmin) {
      return NextResponse.json({ error: 'Cannot switch to super admin' }, { status: 403 });
    }

    // Check if target is super admin
    const targetIsSuperAdmin = targetUser.role_name === 'super_admin';

    // Check if non-super-admin user has any active site assignments
    if (!targetIsSuperAdmin) {
      const [siteCheck] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count 
         FROM site_users su 
         INNER JOIN sites s ON su.site_id = s.id 
         WHERE su.user_id = ? AND s.is_active = 1`,
        [targetUser.id]
      );

      if (siteCheck[0].count === 0) {
        return NextResponse.json({ 
          error: 'Cannot switch to user with no active site assignments' 
        }, { status: 400 });
      }
    }

    // Parse permissions
    let permissions = {};
    if (targetUser.permissions) {
      try {
        permissions = typeof targetUser.permissions === 'string' 
          ? JSON.parse(targetUser.permissions) 
          : targetUser.permissions;
      } catch (e) {
        console.error('Failed to parse permissions:', e);
        permissions = {};
      }
    }

    if (targetIsSuperAdmin) {
      permissions = new Proxy({ is_super_admin: true }, {
        get: () => true
      });
    }

    // Get target user's first assigned site
    let defaultSiteId = 1;
    if (!targetIsSuperAdmin) {
      try {
        const [siteAssignments] = await db.query<RowDataPacket[]>(
          'SELECT site_id FROM site_users WHERE user_id = ? ORDER BY site_id ASC LIMIT 1',
          [targetUser.id]
        );
        if (siteAssignments.length > 0) {
          defaultSiteId = siteAssignments[0].site_id;
        }
      } catch (error) {
        console.error('Error fetching user site assignments:', error);
      }
    }

    // Log the switch activity
    const originalUserId = (session.user as any).id;
    await logActivity({
      userId: Number.parseInt(originalUserId),
      action: 'user_switched' as any,
      entityType: 'user' as any,
      entityId: targetUser.id,
      entityName: `${targetUser.first_name} ${targetUser.last_name}`.trim() || targetUser.username,
      details: `Switched to user: ${targetUser.username}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ 
      success: true,
      switchData: {
        id: targetUser.id.toString(),
        email: targetUser.email,
        name: `${targetUser.first_name} ${targetUser.last_name}`.trim() || targetUser.username,
        role: targetUser.role_name || 'author',
        permissions,
        isSuperAdmin: targetIsSuperAdmin,
        currentSiteId: defaultSiteId,
        originalUserId, // Store original user ID to switch back
        isSwitched: true, // Flag to indicate this is a switched session
      }
    });
  } catch (error) {
    console.error('Error switching user:', error);
    return NextResponse.json({ error: 'Failed to switch user' }, { status: 500 });
  }
}

// Switch back to original user
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const originalUserId = (session.user as any)?.originalUserId;
    const isSwitched = (session.user as any)?.isSwitched;

    if (!isSwitched || !originalUserId) {
      return NextResponse.json({ error: 'Not in switched mode' }, { status: 400 });
    }

    // Get original user details
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT u.*, r.name as role_name, r.permissions 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [originalUserId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Original user not found' }, { status: 404 });
    }

    const originalUser = rows[0];

    // Parse permissions
    let permissions = {};
    if (originalUser.permissions) {
      try {
        permissions = typeof originalUser.permissions === 'string' 
          ? JSON.parse(originalUser.permissions) 
          : originalUser.permissions;
      } catch (e) {
        console.error('Failed to parse permissions:', e);
        permissions = {};
      }
    }

    const isSuperAdmin = originalUser.role_name === 'super_admin';
    if (isSuperAdmin) {
      permissions = new Proxy({ is_super_admin: true }, {
        get: () => true
      });
    }

    // Get original user's site
    let defaultSiteId = 1;
    if (!isSuperAdmin) {
      try {
        const [siteAssignments] = await db.query<RowDataPacket[]>(
          'SELECT site_id FROM site_users WHERE user_id = ? ORDER BY site_id ASC LIMIT 1',
          [originalUser.id]
        );
        if (siteAssignments.length > 0) {
          defaultSiteId = siteAssignments[0].site_id;
        }
      } catch (error) {
        console.error('Error fetching user site assignments:', error);
      }
    }

    // Log the switch back
    await logActivity({
      userId: Number.parseInt(originalUserId),
      action: 'user_switch_back' as any,
      entityType: 'user' as any,
      entityId: originalUser.id,
      entityName: `${originalUser.first_name} ${originalUser.last_name}`.trim() || originalUser.username,
      details: `Switched back to original user: ${originalUser.username}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ 
      success: true,
      switchData: {
        id: originalUser.id.toString(),
        email: originalUser.email,
        name: `${originalUser.first_name} ${originalUser.last_name}`.trim() || originalUser.username,
        role: originalUser.role_name || 'author',
        permissions,
        isSuperAdmin,
        currentSiteId: defaultSiteId,
        originalUserId: null,
        isSwitched: false,
      }
    });
  } catch (error) {
    console.error('Error switching back:', error);
    return NextResponse.json({ error: 'Failed to switch back' }, { status: 500 });
  }
}

