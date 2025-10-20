import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { Menu } from '@/lib/models';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = (session.user as any).permissions || {};
    const siteId = (session.user as any).currentSiteId;
    
    if (!permissions.manage_menus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!siteId || !mongoose.Types.ObjectId.isValid(siteId)) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }

    await connectDB();

    const menus = await Menu.find({ site_id: new mongoose.Types.ObjectId(siteId) })
      .sort({ name: 1 })
      .lean();

    // Format for UI compatibility
    const formattedMenus = menus.map((menu) => ({
      ...menu,
      id: menu._id.toString(),
    }));

    return NextResponse.json({ menus: formattedMenus });
  } catch (error) {
    console.error('Error fetching menus:', error);
    return NextResponse.json({ error: 'Failed to fetch menus' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = (session.user as any).permissions || {};
    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId;
    
    if (!permissions.manage_menus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!siteId || !mongoose.Types.ObjectId.isValid(siteId)) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, display_name, location, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    await connectDB();

    const newMenu = await Menu.create({
      site_id: new mongoose.Types.ObjectId(siteId),
      name,
      display_name: display_name || name,
      location: location || '',
      description: description || '',
    });

    // Log activity
    await logActivity({
      userId,
      action: 'menu_created' as any,
      entityType: 'menu' as any,
      entityId: newMenu._id.toString(),
      entityName: name,
      details: `Created menu: ${name}${location ? ` (${location})` : ''}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ 
      menu: {
        ...newMenu.toObject(),
        id: newMenu._id.toString(),
      }
    });
  } catch (error: any) {
    console.error('Error creating menu:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A menu with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create menu' }, { status: 500 });
  }
}


