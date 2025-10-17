import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response';
import { authenticate } from '@/lib/api/auth-middleware';
import { getCorsHeaders } from '@/lib/api/middleware';

/**
 * POST /api/v1/menus/:id/items
 * Add a new menu item to a menu
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication required
    const auth = await authenticate(req);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    // Check permission
    if (!auth.user.permissions.manage_menus) {
      return ApiErrors.FORBIDDEN('You do not have permission to manage menu items');
    }

    const siteId = auth.user.siteId;
    const menuId = Number.parseInt(params.id);

    if (Number.isNaN(menuId)) {
      return ApiErrors.BAD_REQUEST('Invalid menu ID');
    }

    // Check if menu exists
    const [menuRows] = await db.query(
      `SELECT * FROM site_${siteId}_menus WHERE id = ?`,
      [menuId]
    );

    if ((menuRows as any[]).length === 0) {
      return ApiErrors.NOT_FOUND('Menu', menuId);
    }

    const body = await req.json();

    // Validate required fields
    if (!body.type) {
      return ApiErrors.BAD_REQUEST('Menu item type is required');
    }

    const validTypes = ['post', 'post_type', 'taxonomy', 'term', 'custom'];
    if (!validTypes.includes(body.type)) {
      return ApiErrors.BAD_REQUEST(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Type-specific validation
    if (body.type === 'custom') {
      if (!body.custom_url) {
        return ApiErrors.BAD_REQUEST('custom_url is required for custom menu items');
      }
      if (!body.custom_label) {
        return ApiErrors.BAD_REQUEST('custom_label is required for custom menu items');
      }
    } else if (!body.object_id) {
      return ApiErrors.BAD_REQUEST('object_id is required for non-custom menu items');
    }

    // Get max menu_order for this menu
    const [maxOrderRows] = await db.query(
      `SELECT MAX(menu_order) as max_order FROM site_${siteId}_menu_items WHERE menu_id = ?`,
      [menuId]
    );
    const maxOrder = (maxOrderRows as any[])[0].max_order || 0;
    const menuOrder = body.menu_order === undefined ? maxOrder + 1 : body.menu_order;

    // Create menu item
    const [result] = await db.query(
      `INSERT INTO site_${siteId}_menu_items 
       (menu_id, parent_id, type, object_id, post_type, custom_url, custom_label, menu_order, target)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        menuId,
        body.parent_id || null,
        body.type,
        body.object_id || null,
        body.post_type || null,
        body.custom_url || null,
        body.custom_label || null,
        menuOrder,
        body.target || '_self',
      ]
    );

    const itemId = (result as any).insertId;

    // Save meta fields if provided
    if (body.meta && typeof body.meta === 'object') {
      for (const [key, value] of Object.entries(body.meta)) {
        await db.query(
          `INSERT INTO site_${siteId}_menu_item_meta (menu_item_id, meta_key, meta_value)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)`,
          [itemId, key, value]
        );
      }
    }

    // Get created item
    const [createdRows] = await db.query(
      `SELECT * FROM site_${siteId}_menu_items WHERE id = ?`,
      [itemId]
    );

    const item = (createdRows as any[])[0];

    // Get meta
    const [metaRows] = await db.query(
      `SELECT meta_key, meta_value FROM site_${siteId}_menu_item_meta WHERE menu_item_id = ?`,
      [itemId]
    );

    const meta: Record<string, any> = {};
    for (const metaRow of metaRows as any[]) {
      meta[metaRow.meta_key] = metaRow.meta_value;
    }
    item.meta = meta;

    // Log activity
    const menu = (menuRows as any[])[0];
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'menu_item.created', 'menu_item', ?, ?, ?)`,
      [auth.user.id, siteId, itemId, menu.name, `Added item to menu: ${menu.name}`]
    );

    const response = apiSuccess(item, 201);

    // Add CORS headers
    const headers = getCorsHeaders();
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/v1/menus/:id/items/reorder
 * Reorder menu items
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication required
    const auth = await authenticate(req);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    // Check permission
    if (!auth.user.permissions.manage_menus) {
      return ApiErrors.FORBIDDEN('You do not have permission to reorder menu items');
    }

    const siteId = auth.user.siteId;
    const menuId = Number.parseInt(params.id);

    if (Number.isNaN(menuId)) {
      return ApiErrors.BAD_REQUEST('Invalid menu ID');
    }

    // Check if menu exists
    const [menuRows] = await db.query(
      `SELECT * FROM site_${siteId}_menus WHERE id = ?`,
      [menuId]
    );

    if ((menuRows as any[]).length === 0) {
      return ApiErrors.NOT_FOUND('Menu', menuId);
    }

    const body = await req.json();

    // Validate body is an array of {id, order} objects
    if (!Array.isArray(body.items)) {
      return ApiErrors.BAD_REQUEST('Request body must contain an items array');
    }

    // Update each item's order
    for (const item of body.items) {
      if (!item.id || item.menu_order === undefined) {
        continue;
      }

      await db.query(
        `UPDATE site_${siteId}_menu_items 
         SET menu_order = ?, parent_id = ?
         WHERE id = ? AND menu_id = ?`,
        [item.menu_order, item.parent_id || null, item.id, menuId]
      );
    }

    // Log activity
    const menu = (menuRows as any[])[0];
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'menu.reordered', 'menu', ?, ?, ?)`,
      [auth.user.id, siteId, menuId, menu.name, `Reordered items in menu: ${menu.name}`]
    );

    const response = apiSuccess({
      message: 'Menu items reordered successfully',
      updated: body.items.length,
    });

    // Add CORS headers
    const headers = getCorsHeaders();
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function OPTIONS(req: NextRequest) {
  const headers = getCorsHeaders();
  return new Response(null, {
    status: 204,
    headers,
  });
}

