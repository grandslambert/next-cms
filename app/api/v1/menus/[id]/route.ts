import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response';
import { authenticate } from '@/lib/api/auth-middleware';
import { getCorsHeaders } from '@/lib/api/middleware';

/**
 * Build hierarchical menu structure from flat list
 */
function buildMenuHierarchy(items: any[]): any[] {
  const itemMap = new Map();
  const rootItems: any[] = [];

  // First pass: create map of all items
  for (const item of items) {
    itemMap.set(item.id, { ...item, children: [] });
  }

  // Second pass: build hierarchy
  for (const item of items) {
    const menuItem = itemMap.get(item.id);
    if (item.parent_id && itemMap.has(item.parent_id)) {
      itemMap.get(item.parent_id).children.push(menuItem);
    } else {
      rootItems.push(menuItem);
    }
  }

  return rootItems;
}

/**
 * GET /api/v1/menus/:id
 * Get a single menu with its items
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication required
    const auth = await authenticate(req);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    const siteId = auth.user.siteId;
    const menuId = Number.parseInt(params.id);

    if (Number.isNaN(menuId)) {
      return ApiErrors.BAD_REQUEST('Invalid menu ID');
    }

    const { searchParams } = new URL(req.url);
    const hierarchical = searchParams.get('hierarchical') !== 'false'; // default true

    // Get menu
    const [menuRows] = await db.query(
      `SELECT * FROM site_${siteId}_menus WHERE id = ?`,
      [menuId]
    );

    if ((menuRows as any[]).length === 0) {
      return ApiErrors.NOT_FOUND('Menu', menuId);
    }

    const menu = (menuRows as any[])[0];

    // Get menu items
    const [itemRows] = await db.query(
      `SELECT * FROM site_${siteId}_menu_items 
       WHERE menu_id = ? 
       ORDER BY menu_order ASC, id ASC`,
      [menuId]
    );

    const items = itemRows as any[];

    // For each item, get meta if it exists
    for (const item of items) {
      const [metaRows] = await db.query(
        `SELECT meta_key, meta_value FROM site_${siteId}_menu_item_meta WHERE menu_item_id = ?`,
        [item.id]
      );

      const meta: Record<string, any> = {};
      for (const metaRow of metaRows as any[]) {
        meta[metaRow.meta_key] = metaRow.meta_value;
      }
      item.meta = meta;
    }

    // Build hierarchical structure if requested
    if (hierarchical) {
      menu.items = buildMenuHierarchy(items);
    } else {
      menu.items = items;
    }

    menu.item_count = items.length;

    const response = apiSuccess(menu);

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
 * PUT /api/v1/menus/:id
 * Update a menu (full update)
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
      return ApiErrors.FORBIDDEN('You do not have permission to update menus');
    }

    const siteId = auth.user.siteId;
    const menuId = Number.parseInt(params.id);

    if (Number.isNaN(menuId)) {
      return ApiErrors.BAD_REQUEST('Invalid menu ID');
    }

    // Check if menu exists
    const [existingRows] = await db.query(
      `SELECT * FROM site_${siteId}_menus WHERE id = ?`,
      [menuId]
    );

    if ((existingRows as any[]).length === 0) {
      return ApiErrors.NOT_FOUND('Menu', menuId);
    }

    const body = await req.json();

    // Validate required fields
    if (!body.name) {
      return ApiErrors.BAD_REQUEST('Menu name is required');
    }

    if (!body.location) {
      return ApiErrors.BAD_REQUEST('Menu location is required');
    }

    // Check if another menu has this name
    const [duplicateRows] = await db.query(
      `SELECT id FROM site_${siteId}_menus WHERE name = ? AND id != ?`,
      [body.name, menuId]
    );

    if ((duplicateRows as any[]).length > 0) {
      return ApiErrors.CONFLICT(`Menu with name '${body.name}' already exists`);
    }

    // Update menu
    await db.query(
      `UPDATE site_${siteId}_menus 
       SET name = ?, location = ?, description = ?
       WHERE id = ?`,
      [body.name, body.location, body.description || null, menuId]
    );

    // Get updated menu
    const [updatedRows] = await db.query(
      `SELECT * FROM site_${siteId}_menus WHERE id = ?`,
      [menuId]
    );

    const menu = (updatedRows as any[])[0];

    // Get item count
    const [countRows] = await db.query(
      `SELECT COUNT(*) as count FROM site_${siteId}_menu_items WHERE menu_id = ?`,
      [menuId]
    );
    menu.item_count = (countRows as any[])[0].count;

    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'menu.updated', 'menu', ?, ?, ?)`,
      [auth.user.id, siteId, menuId, menu.name, `Updated menu: ${menu.name}`]
    );

    const response = apiSuccess(menu);

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
 * PATCH /api/v1/menus/:id
 * Partially update a menu
 */
export async function PATCH(
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
      return ApiErrors.FORBIDDEN('You do not have permission to update menus');
    }

    const siteId = auth.user.siteId;
    const menuId = Number.parseInt(params.id);

    if (Number.isNaN(menuId)) {
      return ApiErrors.BAD_REQUEST('Invalid menu ID');
    }

    // Check if menu exists
    const [existingRows] = await db.query(
      `SELECT * FROM site_${siteId}_menus WHERE id = ?`,
      [menuId]
    );

    if ((existingRows as any[]).length === 0) {
      return ApiErrors.NOT_FOUND('Menu', menuId);
    }

    const body = await req.json();
    const updates: string[] = [];
    const sqlParams: any[] = [];

    // Build dynamic update query
    if (body.name !== undefined) {
      // Check for duplicate name
      const [duplicateRows] = await db.query(
        `SELECT id FROM site_${siteId}_menus WHERE name = ? AND id != ?`,
        [body.name, menuId]
      );

      if ((duplicateRows as any[]).length > 0) {
        return ApiErrors.CONFLICT(`Menu with name '${body.name}' already exists`);
      }

      updates.push('name = ?');
      sqlParams.push(body.name);
    }

    if (body.location !== undefined) {
      updates.push('location = ?');
      sqlParams.push(body.location);
    }

    if (body.description !== undefined) {
      updates.push('description = ?');
      sqlParams.push(body.description);
    }

    if (updates.length === 0) {
      return ApiErrors.BAD_REQUEST('No fields to update');
    }

    // Add menu ID to params
    sqlParams.push(menuId);

    // Update menu
    await db.query(
      `UPDATE site_${siteId}_menus 
       SET ${updates.join(', ')}
       WHERE id = ?`,
      sqlParams
    );

    // Get updated menu
    const [updatedRows] = await db.query(
      `SELECT * FROM site_${siteId}_menus WHERE id = ?`,
      [menuId]
    );

    const menu = (updatedRows as any[])[0];

    // Get item count
    const [countRows] = await db.query(
      `SELECT COUNT(*) as count FROM site_${siteId}_menu_items WHERE menu_id = ?`,
      [menuId]
    );
    menu.item_count = (countRows as any[])[0].count;

    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'menu.updated', 'menu', ?, ?, ?)`,
      [auth.user.id, siteId, menuId, menu.name, `Updated menu: ${menu.name}`]
    );

    const response = apiSuccess(menu);

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
 * DELETE /api/v1/menus/:id
 * Delete a menu and all its items
 */
export async function DELETE(
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
      return ApiErrors.FORBIDDEN('You do not have permission to delete menus');
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

    const menu = (menuRows as any[])[0];

    // Delete menu (items will cascade)
    await db.query(
      `DELETE FROM site_${siteId}_menus WHERE id = ?`,
      [menuId]
    );

    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'menu.deleted', 'menu', ?, ?, ?)`,
      [auth.user.id, siteId, menuId, menu.name, `Deleted menu: ${menu.name}`]
    );

    const response = apiSuccess({
      message: 'Menu deleted successfully',
      id: menuId,
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

