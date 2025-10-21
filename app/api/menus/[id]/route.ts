import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels } from '@/lib/model-factory';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid menu ID' }, { status: 400 });
    }

    const Menu = await SiteModels.Menu(siteId);
    const menu = await Menu.findById(params.id).lean();

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      menu: {
        ...(menu as any),
        id: (menu as any)._id.toString(),
      }
    });
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid menu ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, display_name, location, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const Menu = await SiteModels.Menu(siteId);

    // Get current menu BEFORE updating
    const currentMenu = await Menu.findById(params.id).lean();

    if (!currentMenu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    const updatedMenu = await Menu.findByIdAndUpdate(
      params.id,
      {
        name,
        display_name: display_name || name,
        location: location || '',
        description: description || '',
      },
      { new: true }
    );

    // Log activity
    await logActivity({
      userId,
      action: 'menu_updated' as any,
      entityType: 'menu' as any,
      entityId: params.id,
      entityName: name,
      details: `Updated menu: ${name}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      changesBefore: {
        name: (currentMenu as any).name,
        display_name: (currentMenu as any).display_name,
        location: (currentMenu as any).location,
        description: (currentMenu as any).description,
      },
      changesAfter: {
        name: updatedMenu?.name,
        display_name: updatedMenu?.display_name,
        location: updatedMenu?.location,
        description: updatedMenu?.description,
      },
      siteId,
    });

    return NextResponse.json({ 
      menu: {
        ...updatedMenu?.toObject(),
        id: updatedMenu?._id.toString(),
      }
    });
  } catch (error: any) {
    console.error('Error updating menu:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A menu with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update menu' }, { status: 500 });
  }
}

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
    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId;
    
    if (!permissions.manage_menus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid menu ID' }, { status: 400 });
    }

    const Menu = await SiteModels.Menu(siteId);
    const MenuItem = await SiteModels.MenuItem(siteId);

    // Get menu details for logging
    const menu = await Menu.findById(params.id).lean();

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    // Log activity before deleting
    await logActivity({
      userId,
      action: 'menu_deleted' as any,
      entityType: 'menu' as any,
      entityId: params.id,
      entityName: (menu as any).name,
      details: `Deleted menu: ${(menu as any).name}${(menu as any).location ? ` (${(menu as any).location})` : ''}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    // Delete menu items associated with this menu
    await MenuItem.deleteMany({ menu_id: new mongoose.Types.ObjectId(params.id) });

    // Delete menu
    await Menu.findByIdAndDelete(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu:', error);
    return NextResponse.json({ error: 'Failed to delete menu' }, { status: 500 });
  }
}
