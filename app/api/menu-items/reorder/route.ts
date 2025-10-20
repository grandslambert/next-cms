import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import db, { getSiteTable } from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = (session.user as any).permissions || {};
    if (!permissions.manage_menus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const siteId = (session.user as any).currentSiteId || 1;
    const menuItemsTable = getSiteTable(siteId, 'menu_items');

    const body = await request.json();
    const { items } = body; // Array of { id, parent_id, menu_order }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'items array is required' }, { status: 400 });
    }

    // Update each item's order, parent, and editable fields
    for (const item of items) {
      await db.query<ResultSetHeader>(
        `UPDATE ${menuItemsTable} SET parent_id = ?, menu_order = ?, custom_label = ?, custom_url = ?, target = ? WHERE id = ?`,
        [
          item.parent_id || null, 
          item.menu_order,
          item.custom_label || null,
          item.custom_url || null,
          item.target || '_self',
          item.id
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering menu items:', error);
    return NextResponse.json({ error: 'Failed to reorder menu items' }, { status: 500 });
  }
}

