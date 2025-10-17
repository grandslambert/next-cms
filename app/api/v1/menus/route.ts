import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { apiSuccess, apiSuccessPaginated, ApiErrors, handleApiError } from '@/lib/api/response';
import { authenticate } from '@/lib/api/auth-middleware';
import { validatePagination } from '@/lib/api/validation';
import { getCorsHeaders } from '@/lib/api/middleware';

/**
 * GET /api/v1/menus
 * List all menus
 */
export async function GET(req: NextRequest) {
  try {
    // Authentication required
    const auth = await authenticate(req);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    const siteId = auth.user.siteId;
    const { searchParams } = new URL(req.url);

    // Pagination
    const { page, per_page, offset } = validatePagination(searchParams);

    // Search
    const search = searchParams.get('search') || '';

    // Include menu items
    const include = searchParams.get('include')?.split(',').map(i => i.trim()) || [];

    // Build query
    let whereClause = '';
    const params: any[] = [];

    if (search) {
      whereClause = 'WHERE (name LIKE ? OR location LIKE ? OR description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Get total count
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM site_${siteId}_menus ${whereClause}`,
      params
    );
    const total = (countResult as any[])[0].total;

    // Get menus
    const [menuRows] = await db.query(
      `SELECT * FROM site_${siteId}_menus 
       ${whereClause}
       ORDER BY name ASC
       LIMIT ? OFFSET ?`,
      [...params, per_page, offset]
    );

    const menus = menuRows as any[];

    // Include menu items if requested
    if (include.includes('items')) {
      for (const menu of menus) {
        const [itemRows] = await db.query(
          `SELECT * FROM site_${siteId}_menu_items 
           WHERE menu_id = ? 
           ORDER BY menu_order ASC, id ASC`,
          [menu.id]
        );
        menu.items = itemRows;
        menu.item_count = (itemRows as any[]).length;
      }
    } else {
      // Just get count
      for (const menu of menus) {
        const [countRows] = await db.query(
          `SELECT COUNT(*) as count FROM site_${siteId}_menu_items WHERE menu_id = ?`,
          [menu.id]
        );
        menu.item_count = (countRows as any[])[0].count;
      }
    }

    const totalPages = Math.ceil(total / per_page);
    const response = apiSuccessPaginated(
      menus,
      {
        total,
        count: menus.length,
        per_page,
        current_page: page,
        total_pages: totalPages,
      },
      `/api/v1/menus`
    );

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
 * POST /api/v1/menus
 * Create a new menu
 */
export async function POST(req: NextRequest) {
  try {
    // Authentication required
    const auth = await authenticate(req);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    // Check permission
    if (!auth.user.permissions.manage_menus) {
      return ApiErrors.FORBIDDEN('You do not have permission to create menus');
    }

    const siteId = auth.user.siteId;
    const body = await req.json();

    // Validate required fields
    if (!body.name) {
      return ApiErrors.BAD_REQUEST('Menu name is required');
    }

    if (!body.location) {
      return ApiErrors.BAD_REQUEST('Menu location is required');
    }

    // Check if menu with this name already exists
    const [existing] = await db.query(
      `SELECT id FROM site_${siteId}_menus WHERE name = ?`,
      [body.name]
    );

    if ((existing as any[]).length > 0) {
      return ApiErrors.CONFLICT(`Menu with name '${body.name}' already exists`);
    }

    // Create menu
    const [result] = await db.query(
      `INSERT INTO site_${siteId}_menus (name, location, description)
       VALUES (?, ?, ?)`,
      [body.name, body.location, body.description || null]
    );

    const menuId = (result as any).insertId;

    // Get created menu
    const [createdRows] = await db.query(
      `SELECT * FROM site_${siteId}_menus WHERE id = ?`,
      [menuId]
    );

    const menu = (createdRows as any[])[0];
    menu.item_count = 0;

    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'menu.created', 'menu', ?, ?, ?)`,
      [auth.user.id, siteId, menuId, menu.name, `Created menu: ${menu.name}`]
    );

    const response = apiSuccess(menu, 201);

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

