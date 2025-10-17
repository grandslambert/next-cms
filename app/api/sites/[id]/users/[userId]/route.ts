import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any).isSuperAdmin;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    const { role_id } = await request.json();

    if (role_id === undefined || role_id === null) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    // Get site and user info for logging
    const [sites] = await db.query<RowDataPacket[]>(
      'SELECT display_name FROM sites WHERE id = ?',
      [params.id]
    );

    const [users] = await db.query<RowDataPacket[]>(
      'SELECT username FROM users WHERE id = ?',
      [params.userId]
    );

    const [oldRole] = await db.query<RowDataPacket[]>(
      `SELECT r.display_name 
       FROM site_users su 
       INNER JOIN roles r ON su.role_id = r.id
       WHERE su.site_id = ? AND su.user_id = ?`,
      [params.id, params.userId]
    );

    const [newRole] = await db.query<RowDataPacket[]>(
      'SELECT display_name FROM roles WHERE id = ?',
      [role_id]
    );

    // Update user role for site
    await db.execute<ResultSetHeader>(
      'UPDATE site_users SET role_id = ? WHERE site_id = ? AND user_id = ?',
      [role_id, params.id, params.userId]
    );

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'site_user_updated' as any,
      entityType: 'site' as any,
      entityId: Number.parseInt(params.id),
      entityName: sites[0]?.display_name || 'Unknown Site',
      details: `Changed role for ${users[0]?.username || 'user'} from ${oldRole[0]?.display_name || 'unknown'} to ${newRole[0]?.display_name || 'unknown'}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ 
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Error updating site user:', error);
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any).isSuperAdmin;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    // Get site and user info for logging
    const [sites] = await db.query<RowDataPacket[]>(
      'SELECT display_name FROM sites WHERE id = ?',
      [params.id]
    );

    const [users] = await db.query<RowDataPacket[]>(
      'SELECT username FROM users WHERE id = ?',
      [params.userId]
    );

    // Remove user from site
    await db.execute<ResultSetHeader>(
      'DELETE FROM site_users WHERE site_id = ? AND user_id = ?',
      [params.id, params.userId]
    );

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'site_user_removed' as any,
      entityType: 'site' as any,
      entityId: Number.parseInt(params.id),
      entityName: sites[0]?.display_name || 'Unknown Site',
      details: `Removed user ${users[0]?.username || 'user'} from site`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ 
      success: true,
      message: 'User removed from site successfully'
    });
  } catch (error) {
    console.error('Error removing user from site:', error);
    return NextResponse.json({ error: 'Failed to remove user from site' }, { status: 500 });
  }
}

