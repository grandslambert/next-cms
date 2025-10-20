import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { MenuLocation, Menu } from '@/lib/models';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    const permissions = (session.user as any).permissions || {};
    if (!isSuperAdmin && !permissions.manage_settings) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const siteId = (session.user as any).currentSiteId;
    const locationId = params.id;

    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
    }

    await connectDB();

    // Get location info
    const location = await MenuLocation.findById(locationId).lean();

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Check if this is a built-in location
    if (location.is_builtin) {
      return NextResponse.json(
        { error: 'Cannot delete built-in location' },
        { status: 400 }
      );
    }

    // Check if any menus are using this location
    const menuCount = await Menu.countDocuments({ location: location.name });

    if (menuCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete location that is in use by menus' },
        { status: 400 }
      );
    }

    await MenuLocation.findByIdAndDelete(locationId);

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'deleted' as any,
      entityType: 'menu_location' as any,
      entityId: locationId,
      entityName: location.name || 'Unknown',
      details: `Deleted menu location: ${location.name}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu location:', error);
    return NextResponse.json({ error: 'Failed to delete menu location' }, { status: 500 });
  }
}
