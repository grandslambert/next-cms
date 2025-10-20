import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { apiSuccess, apiSuccessPaginated, ApiErrors, handleApiError } from '@/lib/api/response';
import { authenticate } from '@/lib/api/auth-middleware';
import { validatePagination, validateRequired } from '@/lib/api/validation';
import { getCorsHeaders } from '@/lib/api/middleware';

/**
 * GET /api/v1/taxonomies
 * List all taxonomies
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
    const pagination = validatePagination(searchParams);
    const { page, per_page } = pagination;
    const offset = (page - 1) * per_page;

    // Get total count
    const [countRows] = await db.query(
      `SELECT COUNT(*) as total FROM site_${siteId}_taxonomies`
    );
    const total = (countRows as any[])[0].total;
    const totalPages = Math.ceil(total / per_page);

    // Get taxonomies
    const [taxonomyRows] = await db.query(
      `SELECT * FROM site_${siteId}_taxonomies 
       ORDER BY menu_position ASC, name ASC
       LIMIT ? OFFSET ?`,
      [per_page, offset]
    );

    const taxonomies = taxonomyRows as any[];

    // Get term counts for each taxonomy
    for (const taxonomy of taxonomies) {
      const [termCountRows] = await db.query(
        `SELECT COUNT(*) as term_count FROM site_${siteId}_terms WHERE taxonomy_id = ?`,
        [taxonomy.id]
      );
      taxonomy.term_count = (termCountRows as any[])[0].term_count;
    }

    const response = apiSuccessPaginated(
      taxonomies,
      {
        total,
        count: taxonomies.length,
        per_page,
        current_page: page,
        total_pages: totalPages,
      },
      `/api/v1/taxonomies`
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
 * POST /api/v1/taxonomies
 * Create a new taxonomy
 */
export async function POST(req: NextRequest) {
  try {
    // Authentication required
    const auth = await authenticate(req);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    // Check permission
    if (!auth.user.permissions.manage_taxonomies) {
      return ApiErrors.FORBIDDEN('You do not have permission to create taxonomies');
    }

    const siteId = auth.user.siteId;
    const body = await req.json();

    // Validate required fields
    const validation = validateRequired(body, ['name', 'label', 'singular_label']);
    if (!validation.valid) {
      return ApiErrors.VALIDATION_ERROR(
        validation.errors[0].message,
        validation.errors[0].field
      );
    }

    const {
      name,
      label,
      singular_label,
      description = '',
      hierarchical = false,
      public: isPublic = true,
      show_in_menu = true,
      show_in_dashboard = false,
      menu_position = 20,
    } = body;

    // Check if taxonomy with this name already exists
    const [existingRows] = await db.query(
      `SELECT id FROM site_${siteId}_taxonomies WHERE name = ?`,
      [name]
    );

    if ((existingRows as any[]).length > 0) {
      return ApiErrors.CONFLICT(`Taxonomy with name "${name}" already exists`);
    }

    // Create taxonomy
    const [result] = await db.query(
      `INSERT INTO site_${siteId}_taxonomies 
       (name, label, singular_label, description, hierarchical, public, show_in_menu, show_in_dashboard, menu_position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, label, singular_label, description, hierarchical, isPublic, show_in_menu, show_in_dashboard, menu_position]
    );

    const taxonomyId = (result as any).insertId;

    // Get created taxonomy
    const [taxonomyRows] = await db.query(
      `SELECT * FROM site_${siteId}_taxonomies WHERE id = ?`,
      [taxonomyId]
    );

    const taxonomy = (taxonomyRows as any[])[0];
    taxonomy.term_count = 0;

    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'taxonomy.created', 'taxonomy', ?, ?, ?)`,
      [auth.user.id, siteId, taxonomyId, name, `Created taxonomy: ${label}`]
    );

    const response = apiSuccess(taxonomy, 201);

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

