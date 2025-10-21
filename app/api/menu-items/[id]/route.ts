import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels } from '@/lib/model-factory';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';

export async function PUT(
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
    if (!isSuperAdmin && !permissions.manage_menus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const siteId = (session.user as any).currentSiteId;

    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid menu item ID' }, { status: 400 });
    }

    const body = await request.json();
    const { parent_id, post_type, custom_url, custom_label, menu_order, target } = body;

    // Validate parent_id if provided
    if (parent_id && !mongoose.Types.ObjectId.isValid(parent_id)) {
      return NextResponse.json({ error: 'Invalid parent ID' }, { status: 400 });
    }

    const MenuItem = await SiteModels.MenuItem(siteId);
    const Menu = await SiteModels.Menu(siteId);

    // Get current item BEFORE updating
    const currentItem = await MenuItem.findById(params.id).lean();

    if (!currentItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    // Verify menu exists in this site
    const menu = await Menu.findById((currentItem as any).menu_id).lean();

    if (!menu) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const updatedItem = await MenuItem.findByIdAndUpdate(
      params.id,
      {
        parent_id: parent_id ? new mongoose.Types.ObjectId(parent_id) : null,
        post_type: post_type || null,
        custom_url: custom_url || null,
        custom_label: custom_label || null,
        menu_order: menu_order || 0,
        target: target || '_self',
      },
      { new: true }
    );

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'menu_item_updated' as any,
      entityType: 'menu_item' as any,
      entityId: params.id,
      entityName: custom_label || (currentItem as any).custom_label || `${(currentItem as any).type} item`,
      details: `Updated menu item`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
      changesBefore: {
        parent_id: (currentItem as any).parent_id?.toString() || null,
        post_type: (currentItem as any).post_type,
        custom_url: (currentItem as any).custom_url,
        custom_label: (currentItem as any).custom_label,
        menu_order: (currentItem as any).menu_order,
        target: (currentItem as any).target,
      },
      changesAfter: {
        parent_id: updatedItem?.parent_id?.toString() || null,
        post_type: updatedItem?.post_type,
        custom_url: updatedItem?.custom_url,
        custom_label: updatedItem?.custom_label,
        menu_order: updatedItem?.menu_order,
        target: updatedItem?.target,
      },
    });

    return NextResponse.json({ 
      item: {
        ...updatedItem?.toObject(),
        id: updatedItem?._id.toString(),
      }
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
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

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    const permissions = (session.user as any).permissions || {};
    if (!isSuperAdmin && !permissions.manage_menus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const siteId = (session.user as any).currentSiteId;

    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid menu item ID' }, { status: 400 });
    }

    const MenuItem = await SiteModels.MenuItem(siteId);
    const Menu = await SiteModels.Menu(siteId);

    // Get item details for logging
    const item = await MenuItem.findById(params.id).lean();

    if (!item) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    // Verify menu exists in this site
    const menu = await Menu.findById((item as any).menu_id).lean();

    if (!menu) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Log activity before deleting
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'menu_item_deleted' as any,
      entityType: 'menu_item' as any,
      entityId: params.id,
      entityName: (item as any).custom_label || `${(item as any).type} item`,
      details: `Deleted menu item from menu ID ${(item as any).menu_id.toString()}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    await MenuItem.findByIdAndDelete(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 });
  }
}
