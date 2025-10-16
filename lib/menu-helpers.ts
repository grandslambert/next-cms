import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// Helper function to build hierarchical slug path
async function buildHierarchicalSlugPath(postId: number): Promise<string> {
  const slugs: string[] = [];
  let currentId: number | null = postId;

  while (currentId) {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT slug, parent_id FROM posts WHERE id = ?',
      [currentId]
    );

    if (!rows.length) break;

    const post = rows[0] as any;
    slugs.unshift(post.slug);
    currentId = post.parent_id;
  }

  return slugs.join('/');
}

export interface MenuItem {
  id: number;
  parent_id: number | null;
  label: string;
  url: string;
  target: string;
  title_attr?: string;
  css_classes?: string;
  xfn?: string;
  description?: string;
}

export async function getMenuByLocation(location: string): Promise<MenuItem[]> {
  try {
    // Get the menu for this location
    const [menuRows] = await db.query<RowDataPacket[]>(
      'SELECT id, name FROM menus WHERE location = ?',
      [location]
    );

    if (!menuRows.length) {
      return [];
    }

    const menu = menuRows[0];

    // Get menu items with their metadata
    const [itemRows] = await db.query<RowDataPacket[]>(
      `SELECT mi.*,
              pt.name as post_type_slug,
              pt.label as post_type_label,
              pt.url_structure as post_type_url,
              pt.hierarchical as post_type_hierarchical,
              tax.name as taxonomy_slug,
              tax.label as taxonomy_label,
              p.id as post_id,
              p.slug as post_slug,
              p.title as post_title,
              p.parent_id as post_parent_id,
              p.post_type as post_post_type,
              pt2.hierarchical as post_hierarchical,
              pt2.url_structure as post_url_structure
       FROM menu_items mi
       LEFT JOIN post_types pt ON mi.type = 'post_type' AND mi.object_id = pt.id
       LEFT JOIN taxonomies tax ON mi.type = 'taxonomy' AND mi.object_id = tax.id
       LEFT JOIN posts p ON mi.type = 'post' AND mi.object_id = p.id
       LEFT JOIN post_types pt2 ON p.post_type = pt2.name
       WHERE mi.menu_id = ? 
       ORDER BY mi.menu_order ASC, mi.id ASC`,
      [(menu as any).id]
    );

    // Fetch meta data for each item
    if (itemRows.length > 0) {
      const [metaRows] = await db.query<RowDataPacket[]>(
        `SELECT menu_item_id, meta_key, meta_value 
         FROM menu_item_meta 
         WHERE menu_item_id IN (?)`,
        [itemRows.map((r: any) => r.id)]
      );

      // Attach meta to items and generate URLs
      for (const item of itemRows) {
        const itemAny = item as any;
        const itemMeta = (metaRows as any[]).filter((m: any) => m.menu_item_id === itemAny.id);
        
        for (const m of itemMeta) {
          itemAny[m.meta_key] = m.meta_value;
        }

        // Generate URL for the item
        if (itemAny.type === 'custom') {
          itemAny.url = itemAny.custom_url;
        } else if (itemAny.type === 'post_type') {
          itemAny.url = `/${itemAny.post_type_slug}`;
        } else if (itemAny.type === 'taxonomy') {
          itemAny.url = `/${itemAny.taxonomy_slug}`;
        } else if (itemAny.type === 'post' && itemAny.post_id) {
          // Check if this post's type is hierarchical (using pt2.hierarchical from the join)
          const isHierarchical = itemAny.post_hierarchical === 1 || itemAny.post_hierarchical === true;
          
          console.log(`Post ${itemAny.post_id} (${itemAny.post_title}): hierarchical=${itemAny.post_hierarchical}, isHierarchical=${isHierarchical}`);
          
          if (isHierarchical) {
            // For hierarchical post types, always build the full path
            const slugPath = await buildHierarchicalSlugPath(itemAny.post_id);
            itemAny.url = `/${slugPath}`;
            console.log(`Built hierarchical URL for post ${itemAny.post_id}: /${slugPath}`);
          } else {
            // Non-hierarchical: use URL structure
            const urlStructure = itemAny.post_url_structure || '/:slug';
            itemAny.url = urlStructure.replace(':slug', itemAny.post_slug);
            console.log(`Built non-hierarchical URL: ${itemAny.url}`);
          }
        }

        // Determine the display label
        if (itemAny.custom_label) {
          itemAny.label = itemAny.custom_label;
        } else if (itemAny.type === 'post') {
          itemAny.label = itemAny.post_title;
        } else if (itemAny.type === 'post_type') {
          itemAny.label = itemAny.post_type_label;
        } else if (itemAny.type === 'taxonomy') {
          itemAny.label = itemAny.taxonomy_label;
        } else {
          itemAny.label = itemAny.custom_url;
        }
      }
    }

    return itemRows as unknown as MenuItem[];
  } catch (error) {
    console.error('Error fetching menu:', error);
    return [];
  }
}

