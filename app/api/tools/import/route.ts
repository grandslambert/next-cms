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
      mediaFolders: 0,
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
            (name, slug, label, singular_label, description, icon, url_structure, supports, 
             public, show_in_dashboard, hierarchical, menu_position, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              postType.name, 
              postType.slug || postType.name, 
              postType.label, 
              postType.singular_label || postType.label,
              postType.description, 
              postType.icon || postType.menu_icon || '📄',
              postType.url_structure || 'default',
              postType.supports || JSON.stringify({title: true, content: true, excerpt: true, featured_image: true}),
              postType.public !== undefined ? postType.public : true,
              postType.show_in_dashboard !== undefined ? postType.show_in_dashboard : (postType.show_in_menu !== undefined ? postType.show_in_menu : true),
              postType.hierarchical !== undefined ? postType.hierarchical : false,
              postType.menu_position || 5,
              postType.created_at, 
              postType.updated_at
            ]
          );
          stats.postTypes++;
        }
      }
    }

    // Import Taxonomies
    if (importData.data.taxonomies) {
      const { taxonomies, terms, term_relationships } = importData.data.taxonomies;
      
      // Import taxonomy definitions
      for (const taxonomy of taxonomies || []) {
        const [existing] = await db.query<RowDataPacket[]>(
          'SELECT id FROM taxonomies WHERE name = ?',
          [taxonomy.name]
        );

        if (existing.length === 0) {
          await db.query(
            `INSERT INTO taxonomies 
            (name, label, singular_label, description, hierarchical, public, show_in_menu, show_in_dashboard, menu_position, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              taxonomy.name, 
              taxonomy.label,
              taxonomy.singular_label || taxonomy.label,
              taxonomy.description, 
              taxonomy.hierarchical !== undefined ? taxonomy.hierarchical : false,
              taxonomy.public !== undefined ? taxonomy.public : true,
              taxonomy.show_in_menu !== undefined ? taxonomy.show_in_menu : true,
              taxonomy.show_in_dashboard !== undefined ? taxonomy.show_in_dashboard : false,
              taxonomy.menu_position || 20,
              taxonomy.created_at, 
              taxonomy.updated_at
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
        } else {
          termId = existing[0].id;
        }
        
        termIdMapping[term.id] = termId;
      }
      
      // Import term relationships (post-to-term assignments)
      if (term_relationships) {
        for (const rel of term_relationships) {
          // Only import if both post and term exist
          const [postExists] = await db.query<RowDataPacket[]>(
            'SELECT id FROM posts WHERE id = ?',
            [rel.post_id]
          );
          const [termExists] = await db.query<RowDataPacket[]>(
            'SELECT id FROM terms WHERE id = ?',
            [rel.term_id]
          );
          
          if (postExists.length > 0 && termExists.length > 0) {
            await db.query(
              'INSERT IGNORE INTO term_relationships (post_id, term_id) VALUES (?, ?)',
              [rel.post_id, rel.term_id]
            );
          }
        }
      }
    }

    // Import Media Folders first (before media)
    if (importData.data.media_folders) {
      for (const folder of importData.data.media_folders) {
        const [existing] = await db.query<RowDataPacket[]>(
          'SELECT id FROM media_folders WHERE name = ? AND parent_id <=> ?',
          [folder.name, folder.parent_id]
        );

        if (existing.length === 0) {
          await db.query(
            'INSERT INTO media_folders (name, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?)',
            [folder.name, folder.parent_id, folder.created_at, folder.updated_at]
          );
          stats.mediaFolders++;
        }
      }
    }

    // Import Media
    if (importData.data.media) {
      for (const media of importData.data.media) {
        const [existing] = await db.query<RowDataPacket[]>(
          'SELECT id FROM media WHERE filename = ? AND url = ?',
          [media.filename, media.url]
        );

        if (existing.length === 0) {
          // Check if folder exists, set to null if not
          let folderId = media.folder_id;
          if (folderId) {
            const [folderExists] = await db.query<RowDataPacket[]>(
              'SELECT id FROM media_folders WHERE id = ?',
              [folderId]
            );
            if (folderExists.length === 0) {
              folderId = null;
            }
          }

          // Check if uploaded_by user exists, default to 1 if not
          let uploadedBy = media.uploaded_by || 1;
          const [userExists] = await db.query<RowDataPacket[]>(
            'SELECT id FROM users WHERE id = ?',
            [uploadedBy]
          );
          if (userExists.length === 0) {
            uploadedBy = 1;
          }

          await db.query(
            `INSERT INTO media 
            (filename, original_name, title, alt_text, mime_type, size, url, sizes, folder_id, uploaded_by, deleted_at, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              media.filename,
              media.original_name,
              media.title,
              media.alt_text,
              media.mime_type,
              media.size,
              media.url,
              typeof media.sizes === 'string' ? media.sizes : JSON.stringify(media.sizes),
              folderId,
              uploadedBy,
              media.deleted_at || null,
              media.created_at
            ]
          );
          stats.media++;
        }
      }
    }

    // Import Posts
    if (importData.data.posts) {
      const postIdMapping: { [key: number]: number } = {};
      
      // Sort posts - parents first (parent_id = null), then children
      const sortedPosts = (importData.data.posts || []).sort((a: any, b: any) => {
        if (a.parent_id === null && b.parent_id !== null) return -1;
        if (a.parent_id !== null && b.parent_id === null) return 1;
        return 0;
      });
      
      for (const post of sortedPosts) {
        const [existing] = await db.query<RowDataPacket[]>(
          'SELECT id FROM posts WHERE slug = ? AND post_type = ?',
          [post.slug, post.post_type]
        );

        let postId: number;
        if (existing.length === 0) {
          // Validate featured_image_id exists, set to null if not
          let featuredImageId = post.featured_image_id;
          if (featuredImageId) {
            const [imageExists] = await db.query<RowDataPacket[]>(
              'SELECT id FROM media WHERE id = ?',
              [featuredImageId]
            );
            if (imageExists.length === 0) {
              featuredImageId = null;
            }
          }

          // Map parent_id to new ID if it exists
          const newParentId = post.parent_id ? (postIdMapping[post.parent_id] || null) : null;

          // Validate author_id exists, default to 1 if not
          let authorId = post.author_id || 1;
          const [authorExists] = await db.query<RowDataPacket[]>(
            'SELECT id FROM users WHERE id = ?',
            [authorId]
          );
          if (authorExists.length === 0) {
            authorId = 1;
          }

          const [result] = await db.query<ResultSetHeader>(
            `INSERT INTO posts 
            (title, slug, content, excerpt, status, post_type, author_id, featured_image_id, 
             parent_id, menu_order, published_at, scheduled_publish_at, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              post.title, post.slug, post.content, post.excerpt, post.status, post.post_type,
              authorId, featuredImageId, newParentId, post.menu_order,
              post.published_at, post.scheduled_publish_at, post.created_at, post.updated_at
            ]
          );
          postId = result.insertId;
          postIdMapping[post.id] = postId;
          stats.posts++;

          // Import post meta
          if (post.meta && Array.isArray(post.meta)) {
            for (const meta of post.meta) {
              await db.query(
                'INSERT INTO post_meta (post_id, meta_key, meta_value) VALUES (?, ?, ?)',
                [postId, meta.meta_key, meta.meta_value]
              );
            }
          }
        } else {
          postId = existing[0].id;
          postIdMapping[post.id] = postId;
        }
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

          // Map old menu item IDs to new IDs
          const menuItemIdMapping: { [key: number]: number } = {};
          
          // Get items for this menu and sort by parent_id (nulls first)
          const itemsForMenu = (menu_items || [])
            .filter((item: any) => item.menu_id === menu.id)
            .sort((a: any, b: any) => {
              if (a.parent_id === null && b.parent_id !== null) return -1;
              if (a.parent_id !== null && b.parent_id === null) return 1;
              return 0;
            });

          // Import menu items (parents first, then children)
          for (const item of itemsForMenu) {
            // Map parent_id to new ID if it exists
            const newParentId = item.parent_id ? (menuItemIdMapping[item.parent_id] || null) : null;
            
            const [itemResult] = await db.query<ResultSetHeader>(
              `INSERT INTO menu_items 
              (menu_id, parent_id, type, object_id, post_type, custom_url, custom_label, menu_order, target, created_at, updated_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                menuId, newParentId, item.type, item.object_id, item.post_type,
                item.custom_url, item.custom_label, item.menu_order, item.target, 
                item.created_at, item.updated_at
              ]
            );
            
            // Store the mapping
            menuItemIdMapping[item.id] = itemResult.insertId;
            stats.menuItems++;

            // Import menu item meta
            if (item.meta && Array.isArray(item.meta)) {
              for (const meta of item.meta) {
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
            'INSERT INTO users (username, first_name, last_name, email, role_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user.username, user.first_name, user.last_name, user.email, user.role_id, user.created_at, user.updated_at]
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

