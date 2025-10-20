import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { MenuLocation } from '@/lib/models';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteId = (session.user as any).currentSiteId;

    if (!siteId || !mongoose.Types.ObjectId.isValid(siteId)) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }

    await connectDB();

    const locations = await MenuLocation.find({ site_id: new mongoose.Types.ObjectId(siteId) })
      .sort({ name: 1 })
      .lean();

    // Format for UI compatibility
    const formattedLocations = locations.map((location) => ({
      ...location,
      id: location._id.toString(),
    }));

    return NextResponse.json({ locations: formattedLocations });
  } catch (error) {
    console.error('Error fetching menu locations:', error);
    return NextResponse.json({ error: 'Failed to fetch menu locations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = (session.user as any).permissions || {};
    if (!permissions.manage_settings) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const siteId = (session.user as any).currentSiteId;
    const body = await request.json();
    const { name, display_name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (!siteId || !mongoose.Types.ObjectId.isValid(siteId)) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }

    await connectDB();

    const newLocation = await MenuLocation.create({
      site_id: new mongoose.Types.ObjectId(siteId),
      name: name.toLowerCase().replaceAll(/[^a-z0-9_]/g, '_'),
      display_name: display_name || name,
      description: description || '',
    });

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'created' as any,
      entityType: 'menu_location' as any,
      entityId: newLocation._id.toString(),
      entityName: name,
      details: `Created menu location: ${name}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId: siteId,
    });

    return NextResponse.json({ 
      location: {
        ...newLocation.toObject(),
        id: newLocation._id.toString(),
      }
    });
  } catch (error) {
    console.error('Error creating menu location:', error);
    return NextResponse.json({ error: 'Failed to create menu location' }, { status: 500 });
  }
}

