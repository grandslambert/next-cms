import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

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

    const siteId = (session.user as any).currentSiteId || 1;
    const menuItemsTable = getSiteTable(siteId, 'menu_items');

    const body = await request.json();
    const { parent_id, post_type, custom_url, custom_label, menu_order, target } = body;

    // Get current item BEFORE updating
    const [beforeUpdate] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${menuItemsTable} WHERE id = ?`,
      [params.id]
    );

    if (beforeUpdate.length === 0) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    const currentItem = beforeUpdate[0];

    await db.query<ResultSetHeader>(
      `UPDATE ${menuItemsTable} 
       SET parent_id = ?, post_type = ?, custom_url = ?, custom_label = ?, menu_order = ?, target = ?
       WHERE id = ?`,
      [parent_id || null, post_type || null, custom_url || null, custom_label || null, menu_order || 0, target || '_self', params.id]
    );

    const [updated] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${menuItemsTable} WHERE id = ?`,
      [params.id]
    );

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'menu_item_updated' as any,
      entityType: 'menu_item' as any,
      entityId: Number.parseInt(params.id),
      entityName: custom_label || currentItem.custom_label || `${currentItem.type} item`,
      details: `Updated menu item`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
      changesBefore: {
        parent_id: currentItem.parent_id,
        post_type: currentItem.post_type,
        custom_url: currentItem.custom_url,
        custom_label: currentItem.custom_label,
        menu_order: currentItem.menu_order,
        target: currentItem.target,
      },
      changesAfter: {
        parent_id: updated[0].parent_id,
        post_type: updated[0].post_type,
        custom_url: updated[0].custom_url,
        custom_label: updated[0].custom_label,
        menu_order: updated[0].menu_order,
        target: updated[0].target,
      },
    });

    return NextResponse.json({ item: updated[0] });
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

    const siteId = (session.user as any).currentSiteId || 1;
    const menuItemsTable = getSiteTable(siteId, 'menu_items');

    // Get item details for logging
    const [itemRows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${menuItemsTable} WHERE id = ?`,
      [params.id]
    );

    if (itemRows.length === 0) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    const item = itemRows[0];

    // Log activity before deleting
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'menu_item_deleted' as any,
      entityType: 'menu_item' as any,
      entityId: Number.parseInt(params.id),
      entityName: item.custom_label || `${item.type} item`,
      details: `Deleted menu item from menu ID ${item.menu_id}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    await db.query<ResultSetHeader>(`DELETE FROM ${menuItemsTable} WHERE id = ?`, [params.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 });
  }
}

