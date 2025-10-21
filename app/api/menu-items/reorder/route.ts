import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels } from '@/lib/model-factory';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { items } = body; // Array of { id, menu_order, parent_id }

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'items must be an array' }, { status: 400 });
    }

    const MenuItem = await SiteModels.MenuItem(siteId);

    // Update each item's order and parent
    const updatePromises = items.map((item: any) => {
      if (!mongoose.Types.ObjectId.isValid(item.id)) {
        throw new Error(`Invalid item ID: ${item.id}`);
      }

      return MenuItem.findByIdAndUpdate(item.id, {
        menu_order: item.menu_order || 0,
        parent_id: item.parent_id ? new mongoose.Types.ObjectId(item.parent_id) : null,
      });
    });

    await Promise.all(updatePromises);

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'menu_items_reordered' as any,
      entityType: 'menu_item' as any,
      entityId: items[0]?.id || 'multiple',
      entityName: 'Menu items',
      details: `Reordered ${items.length} menu item(s)`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering menu items:', error);
    return NextResponse.json({ error: 'Failed to reorder menu items' }, { status: 500 });
  }
}
