import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

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
    if (!permissions.manage_menus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const siteId = (session.user as any).currentSiteId || 1;
    const menuItemMetaTable = getSiteTable(siteId, 'menu_item_meta');
    const menuItemId = params.id;

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT meta_key, meta_value FROM ${menuItemMetaTable} WHERE menu_item_id = ?`,
      [menuItemId]
    );

    // Convert to key-value object
    const meta: { [key: string]: string } = {};
    rows.forEach((row: any) => {
      meta[row.meta_key] = row.meta_value;
    });

    return NextResponse.json({ meta });
  } catch (error) {
    console.error('Error fetching menu item meta:', error);
    return NextResponse.json({ error: 'Failed to fetch menu item meta' }, { status: 500 });
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
    if (!permissions.manage_menus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const siteId = (session.user as any).currentSiteId || 1;
    const menuItemMetaTable = getSiteTable(siteId, 'menu_item_meta');
    const menuItemId = params.id;
    const body = await request.json();
    const { meta } = body; // Object with key-value pairs

    if (!meta || typeof meta !== 'object') {
      return NextResponse.json({ error: 'meta object is required' }, { status: 400 });
    }

    // Delete existing meta
    await db.query(`DELETE FROM ${menuItemMetaTable} WHERE menu_item_id = ?`, [menuItemId]);

    // Insert new meta
    for (const [key, value] of Object.entries(meta)) {
      if (value) { // Only save non-empty values
        await db.query<ResultSetHeader>(
          `INSERT INTO ${menuItemMetaTable} (menu_item_id, meta_key, meta_value) VALUES (?, ?, ?)`,
          [menuItemId, key, value]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating menu item meta:', error);
    return NextResponse.json({ error: 'Failed to update menu item meta' }, { status: 500 });
  }
}


