import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileText = await file.text();
    const importData = JSON.parse(fileText);

    if (!importData.version || !importData.data) {
      return NextResponse.json({ error: 'Invalid import file format' }, { status: 400 });
    }

    const stats = {
      posts: 0,
      media: 0,
      taxonomies: 0,
      terms: 0,
      menus: 0,
      menuItems: 0,
      postTypes: 0,
      settings: 0,
      users: 0,
    };

    // Import Post Types first (dependencies)
    if (importData.data.postTypes) {
      const { post_types, post_type_taxonomies } = importData.data.postTypes;
      
      for (const postType of post_types || []) {
        const [existing] = await db.query<RowDataPacket[]>(
          'SELECT id FROM post_types WHERE name = ?',
          [postType.name]
        );

        if (existing.length === 0) {
          await db.query(
            `INSERT INTO post_types 
            (name, label, description, hierarchical, public, show_in_menu, menu_icon, menu_position, 
             supports_title, supports_content, supports_excerpt, supports_featured_image, 
             url_structure, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              postType.name, postType.label, postType.description, postType.hierarchical,
              postType.public, postType.show_in_menu, postType.menu_icon, postType.menu_position,
              postType.supports_title, postType.supports_content, postType.supports_excerpt,
              postType.supports_featured_image, postType.url_structure,
              postType.created_at, postType.updated_at
            ]
          );
          stats.postTypes++;
        }
      }
    }

    // Import Taxonomies
    if (importData.data.taxonomies) {
      const { taxonomies, terms, post_terms } = importData.data.taxonomies;
      
      // Import taxonomy definitions
      for (const taxonomy of taxonomies || []) {
        const [existing] = await db.query<RowDataPacket[]>(
          'SELECT id FROM taxonomies WHERE name = ?',
          [taxonomy.name]
        );

        if (existing.length === 0) {
          await db.query(
            `INSERT INTO taxonomies 
            (name, label, description, hierarchical, public, show_in_menu, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              taxonomy.name, taxonomy.label, taxonomy.description, taxonomy.hierarchical,
              taxonomy.public, taxonomy.show_in_menu, taxonomy.created_at, taxonomy.updated_at
            ]
          );
          stats.taxonomies++;
        }
      }

      // Import terms
      const termIdMapping: { [key: number]: number } = {};
      
      for (const term of terms || []) {
        const [existing] = await db.query<RowDataPacket[]>(
          'SELECT id FROM terms WHERE taxonomy_id = (SELECT id FROM taxonomies WHERE name = ?) AND slug = ?',
          [term.taxonomy_id, term.slug]
        );

        let termId: number;
        if (existing.length === 0) {
          const [result] = await db.query<ResultSetHeader>(
            `INSERT INTO terms 
            (taxonomy_id, name, slug, description, parent_id, created_at, updated_at) 
            VALUES ((SELECT id FROM taxonomies WHERE id = ?), ?, ?, ?, ?, ?, ?)`,
            [term.taxonomy_id, term.name, term.slug, term.description, term.parent_id, term.created_at, term.updated_at]
          );
          termId = result.insertId;
          stats.terms++;

          // Import term meta
          if (term.meta) {
            const metaArray = JSON.parse(term.meta);
            for (const meta of metaArray) {
              await db.query(
                'INSERT INTO term_meta (term_id, meta_key, meta_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)',
                [termId, meta.meta_key, meta.meta_value]
              );
            }
          }
        } else {
          termId = existing[0].id;
        }
        
        termIdMapping[term.id] = termId;
      }
    }

    // Import Media
    if (importData.data.media) {
      for (const media of importData.data.media) {
        const [existing] = await db.query<RowDataPacket[]>(
          'SELECT id FROM media WHERE filename = ? AND filepath = ?',
          [media.filename, media.filepath]
        );

        if (existing.length === 0) {
          await db.query(
            `INSERT INTO media 
            (filename, filepath, filetype, filesize, alt_text, title, folder_id, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              media.filename, media.filepath, media.filetype, media.filesize,
              media.alt_text, media.title, media.folder_id, media.created_at, media.updated_at
            ]
          );
          stats.media++;
        }
      }
    }

    // Import Posts
    if (importData.data.posts) {
      const postIdMapping: { [key: number]: number } = {};
      
      for (const post of importData.data.posts) {
        const [existing] = await db.query<RowDataPacket[]>(
          'SELECT id FROM posts WHERE slug = ? AND post_type = ?',
          [post.slug, post.post_type]
        );

        let postId: number;
        if (existing.length === 0) {
          const [result] = await db.query<ResultSetHeader>(
            `INSERT INTO posts 
            (title, slug, content, excerpt, status, post_type, author_id, featured_image_id, 
             parent_id, menu_order, published_at, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              post.title, post.slug, post.content, post.excerpt, post.status, post.post_type,
              post.author_id, post.featured_image_id, post.parent_id, post.menu_order,
              post.published_at, post.created_at, post.updated_at
            ]
          );
          postId = result.insertId;
          stats.posts++;

          // Import post meta
          if (post.meta) {
            const metaArray = JSON.parse(post.meta);
            for (const meta of metaArray) {
              await db.query(
                'INSERT INTO post_meta (post_id, meta_key, meta_value) VALUES (?, ?, ?)',
                [postId, meta.meta_key, meta.meta_value]
              );
            }
          }
        } else {
          postId = existing[0].id;
        }
        
        postIdMapping[post.id] = postId;
      }
    }

    // Import Menus
    if (importData.data.menus) {
      const { menus, menu_items, menu_locations } = importData.data.menus;
      
      // Import menu locations
      for (const location of menu_locations || []) {
        const [existing] = await db.query<RowDataPacket[]>(
          'SELECT id FROM menu_locations WHERE name = ?',
          [location.name]
        );

        if (existing.length === 0 && !location.is_builtin) {
          await db.query(
            'INSERT INTO menu_locations (name, description, is_builtin, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            [location.name, location.description, location.is_builtin, location.created_at, location.updated_at]
          );
        }
      }

      // Import menus
      for (const menu of menus || []) {
        const [existing] = await db.query<RowDataPacket[]>(
          'SELECT id FROM menus WHERE name = ?',
          [menu.name]
        );

        let menuId: number;
        if (existing.length === 0) {
          const [result] = await db.query<ResultSetHeader>(
            'INSERT INTO menus (name, location, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            [menu.name, menu.location, menu.description, menu.created_at, menu.updated_at]
          );
          menuId = result.insertId;
          stats.menus++;

          // Import menu items
          for (const item of menu_items || []) {
            if (item.menu_id === menu.id) {
              const [itemResult] = await db.query<ResultSetHeader>(
                `INSERT INTO menu_items 
                (menu_id, parent_id, type, object_id, custom_url, custom_label, menu_order, target, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  menuId, item.parent_id, item.type, item.object_id, item.custom_url,
                  item.custom_label, item.menu_order, item.target, item.created_at, item.updated_at
                ]
              );
              stats.menuItems++;

              // Import menu item meta
              if (item.meta) {
                const metaArray = JSON.parse(item.meta);
                for (const meta of metaArray) {
                  await db.query(
                    'INSERT INTO menu_item_meta (menu_item_id, meta_key, meta_value) VALUES (?, ?, ?)',
                    [itemResult.insertId, meta.meta_key, meta.meta_value]
                  );
                }
              }
            }
          }
        }
      }
    }

    // Import Settings
    if (importData.data.settings) {
      for (const setting of importData.data.settings) {
        await db.query(
          'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
          [setting.setting_key, setting.setting_value]
        );
        stats.settings++;
      }
    }

    // Import Users (Note: passwords are not imported)
    if (importData.data.users) {
      const { users, roles, user_meta } = importData.data.users;
      
      // Import roles
      for (const role of roles || []) {
        const [existing] = await db.query<RowDataPacket[]>(
          'SELECT id FROM roles WHERE name = ?',
          [role.name]
        );

        if (existing.length === 0) {
          await db.query(
            'INSERT INTO roles (name, permissions, created_at, updated_at) VALUES (?, ?, ?, ?)',
            [role.name, role.permissions, role.created_at, role.updated_at]
          );
        }
      }

      // Import users (skip if email exists, no password import)
      for (const user of users || []) {
        const [existing] = await db.query<RowDataPacket[]>(
          'SELECT id FROM users WHERE email = ?',
          [user.email]
        );

        if (existing.length === 0) {
          const [result] = await db.query<ResultSetHeader>(
            'INSERT INTO users (name, email, role_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [user.name, user.email, user.role_id, user.status, user.created_at, user.updated_at]
          );
          stats.users++;

          // Import user meta
          const userId = result.insertId;
          for (const meta of user_meta || []) {
            if (meta.user_id === user.id) {
              await db.query(
                'INSERT INTO user_meta (user_id, meta_key, meta_value) VALUES (?, ?, ?)',
                [userId, meta.meta_key, meta.meta_value]
              );
            }
          }
        }
      }
    }

    const summary = Object.entries(stats)
      .filter(([_, count]) => count > 0)
      .map(([key, count]) => `${count} ${key}`)
      .join(', ');

    return NextResponse.json({
      success: true,
      summary: summary || 'No new items imported',
      stats,
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import data: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

