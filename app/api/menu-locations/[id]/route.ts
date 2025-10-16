import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = (session.user as any).permissions || {};
    if (!permissions.manage_settings) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const locationId = params.id;

    // Get location info
    const [location] = await db.query<RowDataPacket[]>(
      'SELECT name, is_builtin FROM menu_locations WHERE id = ?',
      [locationId]
    );

    if (!location.length) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Check if this is a built-in location
    if (location[0].is_builtin) {
      return NextResponse.json(
        { error: 'Cannot delete built-in location' },
        { status: 400 }
      );
    }

    // Check if any menus are using this location
    const [menus] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM menus WHERE location = ?',
      [location[0].name]
    );

    if (menus[0].count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete location that is in use by menus' },
        { status: 400 }
      );
    }

    await db.query<ResultSetHeader>(
      'DELETE FROM menu_locations WHERE id = ?',
      [locationId]
    );

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'deleted' as any,
      entityType: 'menu_location' as any,
      entityId: Number.parseInt(locationId),
      entityName: location[0]?.name || 'Unknown',
      details: `Deleted menu location: ${location[0]?.name}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu location:', error);
    return NextResponse.json({ error: 'Failed to delete menu location' }, { status: 500 });
  }
}

