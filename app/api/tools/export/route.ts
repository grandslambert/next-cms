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
      version: '1.16.0',
      exported_at: new Date().toISOString(),
      exported_by: session.user.email,
      data: {},
    };

    // Export Posts & Pages
    if (options.posts) {
      const [posts] = await db.query<RowDataPacket[]>(`
        SELECT 
          p.*,
          COALESCE(
            (SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'meta_key', pm.meta_key,
                'meta_value', pm.meta_value
              )
            ) FROM post_meta pm WHERE pm.post_id = p.id),
            JSON_ARRAY()
          ) as meta
        FROM posts p
        ORDER BY p.id
      `);
      exportData.data.posts = posts;
    }

    // Export Media
    if (options.media) {
      const [media] = await db.query<RowDataPacket[]>(`
        SELECT * FROM media ORDER BY id
      `);
      exportData.data.media = media;
    }

    // Export Taxonomies
    if (options.taxonomies) {
      const [taxonomies] = await db.query<RowDataPacket[]>(`
        SELECT * FROM taxonomies ORDER BY id
      `);
      
      const [terms] = await db.query<RowDataPacket[]>(`
        SELECT t.*, 
          COALESCE(
            (SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'meta_key', tm.meta_key,
                'meta_value', tm.meta_value
              )
            ) FROM term_meta tm WHERE tm.term_id = t.id),
            JSON_ARRAY()
          ) as meta
        FROM terms t
        ORDER BY t.id
      `);
      
      const [postTerms] = await db.query<RowDataPacket[]>(`
        SELECT * FROM post_terms ORDER BY post_id, term_id
      `);

      exportData.data.taxonomies = {
        taxonomies,
        terms,
        post_terms: postTerms,
      };
    }

    // Export Menus
    if (options.menus) {
      const [menus] = await db.query<RowDataPacket[]>(`
        SELECT * FROM menus ORDER BY id
      `);
      
      const [menuItems] = await db.query<RowDataPacket[]>(`
        SELECT mi.*,
          COALESCE(
            (SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'meta_key', mim.meta_key,
                'meta_value', mim.meta_value
              )
            ) FROM menu_item_meta mim WHERE mim.menu_item_id = mi.id),
            JSON_ARRAY()
          ) as meta
        FROM menu_items mi
        ORDER BY mi.menu_id, mi.menu_order
      `);
      
      const [menuLocations] = await db.query<RowDataPacket[]>(`
        SELECT * FROM menu_locations ORDER BY id
      `);

      exportData.data.menus = {
        menus,
        menu_items: menuItems,
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
          id, name, email, role_id, status, created_at, updated_at
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
    const jsonString = JSON.stringify(exportData, null, 2);
    
    return new NextResponse(jsonString, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="nextcms-export-${Date.now()}.json"`,
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

