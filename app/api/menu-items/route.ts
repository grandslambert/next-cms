import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(request: NextRequest) {
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
    const menuItemMetaTable = getSiteTable(siteId, 'menu_item_meta');
    const postTypesTable = getSiteTable(siteId, 'post_types');
    const taxonomiesTable = getSiteTable(siteId, 'taxonomies');
    const postsTable = getSiteTable(siteId, 'posts');
    const termsTable = getSiteTable(siteId, 'terms');

    const searchParams = request.nextUrl.searchParams;
    const menuId = searchParams.get('menu_id');

    if (!menuId) {
      return NextResponse.json({ error: 'menu_id is required' }, { status: 400 });
    }

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT mi.*,
              pt.label as post_type_label,
              tax.label as taxonomy_label,
              p.title as post_title,
              terms.name as term_name,
              tax_for_term.label as term_taxonomy_label
       FROM ${menuItemsTable} mi
       LEFT JOIN ${postTypesTable} pt ON mi.type = 'post_type' AND mi.object_id = pt.id
       LEFT JOIN ${taxonomiesTable} tax ON mi.type = 'taxonomy' AND mi.object_id = tax.id
       LEFT JOIN ${postsTable} p ON mi.type = 'post' AND mi.object_id = p.id
       LEFT JOIN ${termsTable} terms ON mi.type = 'term' AND mi.object_id = terms.id
       LEFT JOIN ${taxonomiesTable} tax_for_term ON terms.taxonomy_id = tax_for_term.id
       WHERE mi.menu_id = ? 
       ORDER BY mi.menu_order ASC, mi.id ASC`,
      [menuId]
    );

    // Fetch meta data for each item (if items exist)
    if (rows.length > 0) {
      const [metaRows] = await db.query<RowDataPacket[]>(
        `SELECT menu_item_id, meta_key, meta_value 
         FROM ${menuItemMetaTable} 
         WHERE menu_item_id IN (?)`,
        [rows.map((r: any) => r.id)]
      );

      // Attach meta to items
      rows.forEach((item: any) => {
        const itemMeta = (metaRows as any[]).filter((m: any) => m.menu_item_id === item.id);
        itemMeta.forEach((m: any) => {
          item[m.meta_key] = m.meta_value;
        });
      });
    }

    return NextResponse.json({ items: rows });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const { menu_id, parent_id, type, object_id, post_type, custom_url, custom_label, menu_order, target } = body;

    if (!menu_id || !type) {
      return NextResponse.json({ error: 'menu_id and type are required' }, { status: 400 });
    }

    if (type === 'custom' && !custom_url) {
      return NextResponse.json({ error: 'custom_url is required for custom links' }, { status: 400 });
    }

    if ((type === 'post' || type === 'post_type' || type === 'taxonomy' || type === 'term') && !object_id) {
      return NextResponse.json({ error: 'object_id is required for this type' }, { status: 400 });
    }

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO ${menuItemsTable} (menu_id, parent_id, type, object_id, post_type, custom_url, custom_label, menu_order, target) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [menu_id, parent_id || null, type, object_id || null, post_type || null, custom_url || null, custom_label || null, menu_order || 0, target || '_self']
    );

    const [newItem] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${menuItemsTable} WHERE id = ?`,
      [result.insertId]
    );

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'menu_item_created' as any,
      entityType: 'menu_item' as any,
      entityId: result.insertId,
      entityName: custom_label || `${type} item`,
      details: `Added menu item to menu ID ${menu_id}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ item: newItem[0] });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 });
  }
}

