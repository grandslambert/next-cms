import { NextRequest, NextResponse } from 'next/server';
import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const location = searchParams.get('location');
    const siteIdParam = searchParams.get('site_id');
    
    // For public routes, allow site_id parameter or default to site 1
    // In production, this could be determined by domain
    const siteId = siteIdParam ? Number.parseInt(siteIdParam) : 1;

    if (!location) {
      return NextResponse.json({ error: 'location parameter is required' }, { status: 400 });
    }

    const menusTable = getSiteTable(siteId, 'menus');
    const menuItemsTable = getSiteTable(siteId, 'menu_items');
    const menuItemMetaTable = getSiteTable(siteId, 'menu_item_meta');
    const postTypesTable = getSiteTable(siteId, 'post_types');
    const taxonomiesTable = getSiteTable(siteId, 'taxonomies');
    const postsTable = getSiteTable(siteId, 'posts');

    // Get the menu for this location
    const [menuRows] = await db.query<RowDataPacket[]>(
      `SELECT id, name FROM ${menusTable} WHERE location = ?`,
      [location]
    );

    if (!menuRows.length) {
      return NextResponse.json({ menu: null, items: [] });
    }

    const menu = menuRows[0];

    // Get menu items with their metadata
    const [itemRows] = await db.query<RowDataPacket[]>(
      `SELECT mi.*,
              pt.name as post_type_slug,
              pt.label as post_type_label,
              pt.url_structure as post_type_url,
              tax.name as taxonomy_slug,
              tax.label as taxonomy_label,
              p.slug as post_slug,
              p.title as post_title
       FROM ${menuItemsTable} mi
       LEFT JOIN ${postTypesTable} pt ON mi.type = 'post_type' AND mi.object_id = pt.id
       LEFT JOIN ${taxonomiesTable} tax ON mi.type = 'taxonomy' AND mi.object_id = tax.id
       LEFT JOIN ${postsTable} p ON mi.type = 'post' AND mi.object_id = p.id
       WHERE mi.menu_id = ? 
       ORDER BY mi.menu_order ASC, mi.id ASC`,
      [menu.id]
    );

    // Fetch meta data for each item
    if (itemRows.length > 0) {
      const [metaRows] = await db.query<RowDataPacket[]>(
        `SELECT menu_item_id, meta_key, meta_value 
         FROM ${menuItemMetaTable} 
         WHERE menu_item_id IN (?)`,
        [itemRows.map((r: any) => r.id)]
      );

      // Attach meta to items
      itemRows.forEach((item: any) => {
        const itemMeta = (metaRows as any[]).filter((m: any) => m.menu_item_id === item.id);
        itemMeta.forEach((m: any) => {
          item[m.meta_key] = m.meta_value;
        });

        // Generate URL for the item
        if (item.type === 'custom') {
          item.url = item.custom_url;
        } else if (item.type === 'post_type') {
          // Archive URL
          item.url = `/${item.post_type_slug}`;
        } else if (item.type === 'taxonomy') {
          item.url = `/${item.taxonomy_slug}`;
        } else if (item.type === 'post') {
          // Individual post URL
          const urlStructure = item.post_type_url || '/:slug';
          item.url = urlStructure.replace(':slug', item.post_slug);
        }

        // Determine the display label
        if (item.custom_label) {
          item.label = item.custom_label;
        } else if (item.type === 'post') {
          item.label = item.post_title;
        } else if (item.type === 'post_type') {
          item.label = item.post_type_label;
        } else if (item.type === 'taxonomy') {
          item.label = item.taxonomy_label;
        } else {
          item.label = item.custom_url;
        }
      });
    }

    return NextResponse.json({ menu, items: itemRows });
  } catch (error) {
    console.error('Error fetching public menu:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}


