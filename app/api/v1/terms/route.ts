import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { apiSuccess, apiSuccessPaginated, ApiErrors, handleApiError } from '@/lib/api/response';
import { authenticate } from '@/lib/api/auth-middleware';
import { validatePagination, validateRequired } from '@/lib/api/validation';
import { getCorsHeaders } from '@/lib/api/middleware';

/**
 * GET /api/v1/terms
 * List terms with filtering by taxonomy
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

    // Filters
    const taxonomy_id = searchParams.get('taxonomy_id');
    const taxonomy = searchParams.get('taxonomy'); // Filter by taxonomy name
    const parent_id = searchParams.get('parent_id');
    const search = searchParams.get('search');
    const include = searchParams.get('include')?.split(',').map(i => i.trim()) || [];

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];

    if (taxonomy_id) {
      conditions.push('t.taxonomy_id = ?');
      params.push(Number.parseInt(taxonomy_id));
    }

    if (taxonomy) {
      conditions.push('tax.name = ?');
      params.push(taxonomy);
    }

    if (parent_id !== null && parent_id !== undefined) {
      if (parent_id === '0' || parent_id === 'null') {
        conditions.push('t.parent_id IS NULL');
      } else {
        conditions.push('t.parent_id = ?');
        params.push(Number.parseInt(parent_id));
      }
    }

    if (search) {
      conditions.push('(t.name LIKE ? OR t.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const [countRows] = await db.query(
      `SELECT COUNT(*) as total 
       FROM site_${siteId}_terms t
       JOIN site_${siteId}_taxonomies tax ON t.taxonomy_id = tax.id
       ${whereClause}`,
      params
    );
    const total = (countRows as any[])[0].total;
    const totalPages = Math.ceil(total / per_page);

    // Get terms
    const [termRows] = await db.query(
      `SELECT t.*, tax.name as taxonomy_name, tax.label as taxonomy_label
       FROM site_${siteId}_terms t
       JOIN site_${siteId}_taxonomies tax ON t.taxonomy_id = tax.id
       ${whereClause}
       ORDER BY t.name ASC
       LIMIT ? OFFSET ?`,
      [...params, per_page, offset]
    );

    const terms = termRows as any[];

    // Include related data
    for (const term of terms) {
      // Include parent
      if (include.includes('parent') && term.parent_id) {
        const [parentRows] = await db.query(
          `SELECT id, name, slug FROM site_${siteId}_terms WHERE id = ?`,
          [term.parent_id]
        );
        term.parent = (parentRows as any[])[0] || null;
      }

      // Include image
      if (include.includes('image') && term.image_id) {
        const [imageRows] = await db.query(
          `SELECT id, filename, url, alt_text FROM site_${siteId}_media WHERE id = ?`,
          [term.image_id]
        );
        term.image = (imageRows as any[])[0] || null;
      }

      // Include children (if hierarchical)
      if (include.includes('children')) {
        const [childRows] = await db.query(
          `SELECT id, name, slug, count FROM site_${siteId}_terms WHERE parent_id = ?`,
          [term.id]
        );
        term.children = childRows as any[];
      }

      // Include meta
      if (include.includes('meta')) {
        const [metaRows] = await db.query(
          `SELECT meta_key, meta_value FROM site_${siteId}_term_meta WHERE term_id = ?`,
          [term.id]
        );
        
        const meta: Record<string, any> = {};
        for (const row of metaRows as any[]) {
          try {
            meta[row.meta_key] = JSON.parse(row.meta_value);
          } catch {
            meta[row.meta_key] = row.meta_value;
          }
        }
        term.meta = meta;
      }
    }

    const response = apiSuccessPaginated(
      terms,
      {
        total,
        count: terms.length,
        per_page,
        current_page: page,
        total_pages: totalPages,
      },
      `/api/v1/terms`
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
 * POST /api/v1/terms
 * Create a new term
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
      return ApiErrors.FORBIDDEN('You do not have permission to create terms');
    }

    const siteId = auth.user.siteId;
    const body = await req.json();

    // Validate required fields
    const validation = validateRequired(body, ['taxonomy_id', 'name']);
    if (!validation.valid) {
      return ApiErrors.VALIDATION_ERROR(
        validation.errors[0].message,
        validation.errors[0].field
      );
    }

    const {
      taxonomy_id,
      name,
      slug,
      description = '',
      parent_id = null,
      image_id = null,
    } = body;

    // Generate slug if not provided
    const termSlug = slug || name
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/(^-)|(-$)/g, '');

    // Check if term with this slug already exists in this taxonomy
    const [existingRows] = await db.query(
      `SELECT id FROM site_${siteId}_terms WHERE taxonomy_id = ? AND slug = ?`,
      [taxonomy_id, termSlug]
    );

    if ((existingRows as any[]).length > 0) {
      return ApiErrors.CONFLICT(`Term with slug "${termSlug}" already exists in this taxonomy`);
    }

    // Create term
    const [result] = await db.query(
      `INSERT INTO site_${siteId}_terms 
       (taxonomy_id, name, slug, description, parent_id, image_id, count)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [taxonomy_id, name, termSlug, description, parent_id, image_id]
    );

    const termId = (result as any).insertId;

    // Handle meta fields if provided
    if (body.meta && typeof body.meta === 'object') {
      for (const [key, value] of Object.entries(body.meta)) {
        await db.query(
          `INSERT INTO site_${siteId}_term_meta (term_id, meta_key, meta_value)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)`,
          [termId, key, typeof value === 'string' ? value : JSON.stringify(value)]
        );
      }
    }

    // Get created term
    const [termRows] = await db.query(
      `SELECT t.*, tax.name as taxonomy_name, tax.label as taxonomy_label
       FROM site_${siteId}_terms t
       JOIN site_${siteId}_taxonomies tax ON t.taxonomy_id = tax.id
       WHERE t.id = ?`,
      [termId]
    );

    const term = (termRows as any[])[0];

    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'term.created', 'term', ?, ?, ?)`,
      [auth.user.id, siteId, termId, name, `Created term: ${name} in ${term.taxonomy_label}`]
    );

    const response = apiSuccess(term, 201);

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

