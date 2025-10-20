import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response';
import { authenticate } from '@/lib/api/auth-middleware';
import { getCorsHeaders } from '@/lib/api/middleware';

/**
 * GET /api/v1/menus/:id/items/:itemId
 * Get a single menu item
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    // Authentication required
    const auth = await authenticate(req);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    const siteId = auth.user.siteId;
    const menuId = Number.parseInt(params.id);
    const itemId = Number.parseInt(params.itemId);

    if (Number.isNaN(menuId) || Number.isNaN(itemId)) {
      return ApiErrors.BAD_REQUEST('Invalid menu or item ID');
    }

    // Get menu item
    const [itemRows] = await db.query(
      `SELECT * FROM site_${siteId}_menu_items WHERE id = ? AND menu_id = ?`,
      [itemId, menuId]
    );

    if ((itemRows as any[]).length === 0) {
      return ApiErrors.NOT_FOUND('Menu item', itemId);
    }

    const item = (itemRows as any[])[0];

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

    const response = apiSuccess(item);

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
 * PATCH /api/v1/menus/:id/items/:itemId
 * Update a menu item
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    // Authentication required
    const auth = await authenticate(req);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    // Check permission
    if (!auth.user.permissions.manage_menus) {
      return ApiErrors.FORBIDDEN('You do not have permission to update menu items');
    }

    const siteId = auth.user.siteId;
    const menuId = Number.parseInt(params.id);
    const itemId = Number.parseInt(params.itemId);

    if (Number.isNaN(menuId) || Number.isNaN(itemId)) {
      return ApiErrors.BAD_REQUEST('Invalid menu or item ID');
    }

    // Check if item exists
    const [existingRows] = await db.query(
      `SELECT * FROM site_${siteId}_menu_items WHERE id = ? AND menu_id = ?`,
      [itemId, menuId]
    );

    if ((existingRows as any[]).length === 0) {
      return ApiErrors.NOT_FOUND('Menu item', itemId);
    }

    const body = await req.json();
    const updates: string[] = [];
    const sqlParams: any[] = [];

    // Build dynamic update query
    if (body.parent_id !== undefined) {
      updates.push('parent_id = ?');
      sqlParams.push(body.parent_id);
    }

    if (body.type !== undefined) {
      const validTypes = ['post', 'post_type', 'taxonomy', 'term', 'custom'];
      if (!validTypes.includes(body.type)) {
        return ApiErrors.BAD_REQUEST(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
      }
      updates.push('type = ?');
      sqlParams.push(body.type);
    }

    if (body.object_id !== undefined) {
      updates.push('object_id = ?');
      sqlParams.push(body.object_id);
    }

    if (body.post_type !== undefined) {
      updates.push('post_type = ?');
      sqlParams.push(body.post_type);
    }

    if (body.custom_url !== undefined) {
      updates.push('custom_url = ?');
      sqlParams.push(body.custom_url);
    }

    if (body.custom_label !== undefined) {
      updates.push('custom_label = ?');
      sqlParams.push(body.custom_label);
    }

    if (body.menu_order !== undefined) {
      updates.push('menu_order = ?');
      sqlParams.push(body.menu_order);
    }

    if (body.target !== undefined) {
      updates.push('target = ?');
      sqlParams.push(body.target);
    }

    if (updates.length > 0) {
      // Add item ID to params
      sqlParams.push(itemId);

      // Update item
      await db.query(
        `UPDATE site_${siteId}_menu_items 
         SET ${updates.join(', ')}
         WHERE id = ?`,
        sqlParams
      );
    }

    // Update meta fields if provided
    if (body.meta && typeof body.meta === 'object') {
      for (const [key, value] of Object.entries(body.meta)) {
        if (value === null) {
          // Delete meta if value is null
          await db.query(
            `DELETE FROM site_${siteId}_menu_item_meta WHERE menu_item_id = ? AND meta_key = ?`,
            [itemId, key]
          );
        } else {
          // Insert or update meta
          await db.query(
            `INSERT INTO site_${siteId}_menu_item_meta (menu_item_id, meta_key, meta_value)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)`,
            [itemId, key, value]
          );
        }
      }
    }

    // Get updated item
    const [updatedRows] = await db.query(
      `SELECT * FROM site_${siteId}_menu_items WHERE id = ?`,
      [itemId]
    );

    const item = (updatedRows as any[])[0];

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
    const [menuRows] = await db.query(
      `SELECT name FROM site_${siteId}_menus WHERE id = ?`,
      [menuId]
    );
    const menuName = (menuRows as any[])[0]?.name || 'Unknown';

    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'menu_item.updated', 'menu_item', ?, ?, ?)`,
      [auth.user.id, siteId, itemId, menuName, `Updated menu item in: ${menuName}`]
    );

    const response = apiSuccess(item);

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
 * DELETE /api/v1/menus/:id/items/:itemId
 * Delete a menu item
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    // Authentication required
    const auth = await authenticate(req);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    // Check permission
    if (!auth.user.permissions.manage_menus) {
      return ApiErrors.FORBIDDEN('You do not have permission to delete menu items');
    }

    const siteId = auth.user.siteId;
    const menuId = Number.parseInt(params.id);
    const itemId = Number.parseInt(params.itemId);

    if (Number.isNaN(menuId) || Number.isNaN(itemId)) {
      return ApiErrors.BAD_REQUEST('Invalid menu or item ID');
    }

    // Check if item exists
    const [itemRows] = await db.query(
      `SELECT * FROM site_${siteId}_menu_items WHERE id = ? AND menu_id = ?`,
      [itemId, menuId]
    );

    if ((itemRows as any[]).length === 0) {
      return ApiErrors.NOT_FOUND('Menu item', itemId);
    }

    // Check if item has children
    const [childrenRows] = await db.query(
      `SELECT COUNT(*) as count FROM site_${siteId}_menu_items WHERE parent_id = ?`,
      [itemId]
    );

    const hasChildren = (childrenRows as any[])[0].count > 0;

    if (hasChildren) {
      return ApiErrors.BAD_REQUEST(
        'Cannot delete menu item with children. Delete or reassign child items first.'
      );
    }

    // Delete item (meta will cascade)
    await db.query(
      `DELETE FROM site_${siteId}_menu_items WHERE id = ?`,
      [itemId]
    );

    // Log activity
    const [menuRows] = await db.query(
      `SELECT name FROM site_${siteId}_menus WHERE id = ?`,
      [menuId]
    );
    const menuName = (menuRows as any[])[0]?.name || 'Unknown';

    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'menu_item.deleted', 'menu_item', ?, ?, ?)`,
      [auth.user.id, siteId, itemId, menuName, `Deleted menu item from: ${menuName}`]
    );

    const response = apiSuccess({
      message: 'Menu item deleted successfully',
      id: itemId,
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

