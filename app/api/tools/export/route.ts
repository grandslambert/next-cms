import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const userPermissions = (session.user as any).permissions || {};
    if (!userPermissions.manage_settings) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const options = await request.json();
    const exportData: any = {
      version: '1.18.0',
      exported_at: new Date().toISOString(),
      exported_by: session.user.email,
      data: {},
    };

    // Export Posts & Pages
    if (options.posts) {
      const [posts] = await db.query<RowDataPacket[]>(`
        SELECT * FROM posts ORDER BY id
      `);
      
      // Fetch post meta separately
      const [postMeta] = await db.query<RowDataPacket[]>(`
        SELECT * FROM post_meta ORDER BY post_id, meta_key
      `);
      
      // Attach meta to each post
      const postsWithMeta = posts.map((post: any) => ({
        ...post,
        meta: postMeta.filter((meta: any) => meta.post_id === post.id)
      }));
      
      exportData.data.posts = postsWithMeta;
    }

    // Export Media
    if (options.media) {
      // Export folders first
      const [mediaFolders] = await db.query<RowDataPacket[]>(`
        SELECT * FROM media_folders ORDER BY id
      `);
      
      const [media] = await db.query<RowDataPacket[]>(`
        SELECT * FROM media ORDER BY id
      `);
      
      exportData.data.media_folders = mediaFolders;
      exportData.data.media = media;
    }

    // Export Taxonomies
    if (options.taxonomies) {
      const [taxonomies] = await db.query<RowDataPacket[]>(`
        SELECT * FROM taxonomies ORDER BY id
      `);
      
      const [terms] = await db.query<RowDataPacket[]>(`
        SELECT * FROM terms ORDER BY id
      `);
      
      const [termRelationships] = await db.query<RowDataPacket[]>(`
        SELECT * FROM term_relationships ORDER BY post_id, term_id
      `);

      exportData.data.taxonomies = {
        taxonomies,
        terms,
        term_relationships: termRelationships,
      };
    }

    // Export Menus
    if (options.menus) {
      const [menus] = await db.query<RowDataPacket[]>(`
        SELECT * FROM menus ORDER BY id
      `);
      
      const [menuItems] = await db.query<RowDataPacket[]>(`
        SELECT * FROM menu_items ORDER BY menu_id, menu_order
      `);
      
      // Fetch menu item meta separately
      const [menuItemMeta] = await db.query<RowDataPacket[]>(`
        SELECT * FROM menu_item_meta ORDER BY menu_item_id, meta_key
      `);
      
      // Attach meta to each menu item
      const menuItemsWithMeta = menuItems.map((item: any) => ({
        ...item,
        meta: menuItemMeta.filter((meta: any) => meta.menu_item_id === item.id)
      }));
      
      const [menuLocations] = await db.query<RowDataPacket[]>(`
        SELECT * FROM menu_locations ORDER BY id
      `);

      exportData.data.menus = {
        menus,
        menu_items: menuItemsWithMeta,
        menu_locations: menuLocations,
      };
    }

    // Export Post Types
    if (options.postTypes) {
      const [postTypes] = await db.query<RowDataPacket[]>(`
        SELECT * FROM post_types ORDER BY id
      `);
      
      const [postTypeTaxonomies] = await db.query<RowDataPacket[]>(`
        SELECT * FROM post_type_taxonomies ORDER BY post_type_id, taxonomy_id
      `);

      exportData.data.postTypes = {
        post_types: postTypes,
        post_type_taxonomies: postTypeTaxonomies,
      };
    }

    // Export Settings
    if (options.settings) {
      const [settings] = await db.query<RowDataPacket[]>(`
        SELECT * FROM settings ORDER BY setting_key
      `);
      exportData.data.settings = settings;
    }

    // Export Users (excluding passwords)
    if (options.users) {
      const [users] = await db.query<RowDataPacket[]>(`
        SELECT 
          id, username, first_name, last_name, email, role_id, created_at, updated_at
        FROM users 
        ORDER BY id
      `);
      
      const [roles] = await db.query<RowDataPacket[]>(`
        SELECT * FROM roles ORDER BY id
      `);
      
      const [userMeta] = await db.query<RowDataPacket[]>(`
        SELECT * FROM user_meta ORDER BY user_id, meta_key
      `);

      exportData.data.users = {
        users,
        roles,
        user_meta: userMeta,
      };
    }

    // Return as JSON file download
    const jsonString = JSON.stringify(exportData, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2);
    
    return new NextResponse(jsonString, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="nextcms-export-${Date.now()}.json"`,
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

