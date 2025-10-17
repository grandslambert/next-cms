import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response';
import { authenticate } from '@/lib/api/auth-middleware';
import { getCorsHeaders } from '@/lib/api/middleware';

/**
 * GET /api/v1/terms/:id
 * Get a single term
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
    const termId = Number.parseInt(params.id);

    if (Number.isNaN(termId)) {
      return ApiErrors.BAD_REQUEST('Invalid term ID');
    }

    const { searchParams } = new URL(req.url);
    const include = searchParams.get('include')?.split(',').map(i => i.trim()) || [];

    // Get term
    const [termRows] = await db.query(
      `SELECT t.*, tax.name as taxonomy_name, tax.label as taxonomy_label, tax.hierarchical
       FROM site_${siteId}_terms t
       JOIN site_${siteId}_taxonomies tax ON t.taxonomy_id = tax.id
       WHERE t.id = ?`,
      [termId]
    );

    const term = (termRows as any[])[0];
    if (!term) {
      return ApiErrors.NOT_FOUND('Term', termId);
    }

    // Include parent
    if (include.includes('parent') && term.parent_id) {
      const [parentRows] = await db.query(
        `SELECT id, name, slug FROM site_${siteId}_terms WHERE id = ?`,
        [term.parent_id]
      );
      term.parent = (parentRows as any[])[0] || null;
    }

    // Include children
    if (include.includes('children')) {
      const [childRows] = await db.query(
        `SELECT id, name, slug, count FROM site_${siteId}_terms WHERE parent_id = ?`,
        [termId]
      );
      term.children = childRows as any[];
    }

    // Include image
    if (include.includes('image') && term.image_id) {
      const [imageRows] = await db.query(
        `SELECT id, filename, url, alt_text, title FROM site_${siteId}_media WHERE id = ?`,
        [term.image_id]
      );
      term.image = (imageRows as any[])[0] || null;
    }

    // Include meta
    if (include.includes('meta')) {
      const [metaRows] = await db.query(
        `SELECT meta_key, meta_value FROM site_${siteId}_term_meta WHERE term_id = ?`,
        [termId]
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

    // Include posts (if requested)
    if (include.includes('posts')) {
      const [postRows] = await db.query(
        `SELECT p.id, p.title, p.slug, p.status, p.published_at
         FROM site_${siteId}_posts p
         JOIN site_${siteId}_term_relationships tr ON p.id = tr.post_id
         WHERE tr.term_id = ?
         ORDER BY p.published_at DESC
         LIMIT 10`,
        [termId]
      );
      term.recent_posts = postRows as any[];
    }

    const response = apiSuccess(term);

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
 * PUT /api/v1/terms/:id
 * Update a term (full update)
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
    if (!auth.user.permissions.manage_taxonomies) {
      return ApiErrors.FORBIDDEN('You do not have permission to update terms');
    }

    const siteId = auth.user.siteId;
    const termId = Number.parseInt(params.id);

    if (Number.isNaN(termId)) {
      return ApiErrors.BAD_REQUEST('Invalid term ID');
    }

    // Check if term exists
    const [existingRows] = await db.query(
      `SELECT * FROM site_${siteId}_terms WHERE id = ?`,
      [termId]
    );

    const existingTerm = (existingRows as any[])[0];
    if (!existingTerm) {
      return ApiErrors.NOT_FOUND('Term', termId);
    }

    const body = await req.json();
    const {
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

    // Check if slug is unique (excluding current term)
    const [duplicateRows] = await db.query(
      `SELECT id FROM site_${siteId}_terms 
       WHERE taxonomy_id = ? AND slug = ? AND id != ?`,
      [existingTerm.taxonomy_id, termSlug, termId]
    );

    if ((duplicateRows as any[]).length > 0) {
      return ApiErrors.CONFLICT(`Term with slug "${termSlug}" already exists in this taxonomy`);
    }

    // Prevent circular parent relationship
    if (parent_id === termId) {
      return ApiErrors.BAD_REQUEST('A term cannot be its own parent');
    }

    // Update term
    await db.query(
      `UPDATE site_${siteId}_terms 
       SET name = ?, slug = ?, description = ?, parent_id = ?, image_id = ?, updated_at = NOW()
       WHERE id = ?`,
      [name, termSlug, description, parent_id, image_id, termId]
    );

    // Handle meta fields if provided
    if (body.meta && typeof body.meta === 'object') {
      // Delete existing meta
      await db.query(
        `DELETE FROM site_${siteId}_term_meta WHERE term_id = ?`,
        [termId]
      );
      
      // Insert new meta
      for (const [key, value] of Object.entries(body.meta)) {
        await db.query(
          `INSERT INTO site_${siteId}_term_meta (term_id, meta_key, meta_value)
           VALUES (?, ?, ?)`,
          [termId, key, typeof value === 'string' ? value : JSON.stringify(value)]
        );
      }
    }

    // Get updated term
    const [updatedRows] = await db.query(
      `SELECT t.*, tax.name as taxonomy_name, tax.label as taxonomy_label
       FROM site_${siteId}_terms t
       JOIN site_${siteId}_taxonomies tax ON t.taxonomy_id = tax.id
       WHERE t.id = ?`,
      [termId]
    );

    const term = (updatedRows as any[])[0];

    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'term.updated', 'term', ?, ?, ?)`,
      [auth.user.id, siteId, termId, name, `Updated term: ${name}`]
    );

    const response = apiSuccess(term);

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
 * PATCH /api/v1/terms/:id
 * Partial update of a term
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
    if (!auth.user.permissions.manage_taxonomies) {
      return ApiErrors.FORBIDDEN('You do not have permission to update terms');
    }

    const siteId = auth.user.siteId;
    const termId = Number.parseInt(params.id);

    if (Number.isNaN(termId)) {
      return ApiErrors.BAD_REQUEST('Invalid term ID');
    }

    // Check if term exists
    const [existingRows] = await db.query(
      `SELECT * FROM site_${siteId}_terms WHERE id = ?`,
      [termId]
    );

    const existingTerm = (existingRows as any[])[0];
    if (!existingTerm) {
      return ApiErrors.NOT_FOUND('Term', termId);
    }

    const body = await req.json();
    const updates: string[] = [];
    const sqlParams: any[] = [];

    // Build dynamic update query
    if (body.name !== undefined) {
      updates.push('name = ?');
      sqlParams.push(body.name);
    }

    if (body.slug !== undefined) {
      // Check if slug is unique
      const [duplicateRows] = await db.query(
        `SELECT id FROM site_${siteId}_terms 
         WHERE taxonomy_id = ? AND slug = ? AND id != ?`,
        [existingTerm.taxonomy_id, body.slug, termId]
      );

      if ((duplicateRows as any[]).length > 0) {
        return ApiErrors.CONFLICT(`Term with slug "${body.slug}" already exists in this taxonomy`);
      }

      updates.push('slug = ?');
      sqlParams.push(body.slug);
    }

    if (body.description !== undefined) {
      updates.push('description = ?');
      sqlParams.push(body.description);
    }

    if (body.parent_id !== undefined) {
      if (body.parent_id === termId) {
        return ApiErrors.BAD_REQUEST('A term cannot be its own parent');
      }
      updates.push('parent_id = ?');
      sqlParams.push(body.parent_id);
    }

    if (body.image_id !== undefined) {
      updates.push('image_id = ?');
      sqlParams.push(body.image_id);
    }

    if (updates.length === 0 && !body.meta) {
      return ApiErrors.BAD_REQUEST('No fields to update');
    }

    // Update term fields if any
    if (updates.length > 0) {
      updates.push('updated_at = NOW()');
      sqlParams.push(termId);

      await db.query(
        `UPDATE site_${siteId}_terms 
         SET ${updates.join(', ')}
         WHERE id = ?`,
        sqlParams
      );
    }

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

    // Get updated term
    const [updatedRows] = await db.query(
      `SELECT t.*, tax.name as taxonomy_name, tax.label as taxonomy_label
       FROM site_${siteId}_terms t
       JOIN site_${siteId}_taxonomies tax ON t.taxonomy_id = tax.id
       WHERE t.id = ?`,
      [termId]
    );

    const term = (updatedRows as any[])[0];

    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'term.updated', 'term', ?, ?, ?)`,
      [auth.user.id, siteId, termId, term.name, `Updated term: ${term.name}`]
    );

    const response = apiSuccess(term);

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
 * DELETE /api/v1/terms/:id
 * Delete a term
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
    if (!auth.user.permissions.manage_taxonomies) {
      return ApiErrors.FORBIDDEN('You do not have permission to delete terms');
    }

    const siteId = auth.user.siteId;
    const termId = Number.parseInt(params.id);

    if (Number.isNaN(termId)) {
      return ApiErrors.BAD_REQUEST('Invalid term ID');
    }

    // Check if term exists
    const [termRows] = await db.query(
      `SELECT t.*, tax.name as taxonomy_name, tax.label as taxonomy_label
       FROM site_${siteId}_terms t
       JOIN site_${siteId}_taxonomies tax ON t.taxonomy_id = tax.id
       WHERE t.id = ?`,
      [termId]
    );

    const term = (termRows as any[])[0];
    if (!term) {
      return ApiErrors.NOT_FOUND('Term', termId);
    }

    // Check if term has children
    const [childRows] = await db.query(
      `SELECT COUNT(*) as child_count FROM site_${siteId}_terms WHERE parent_id = ?`,
      [termId]
    );
    const childCount = (childRows as any[])[0].child_count;

    if (childCount > 0) {
      return ApiErrors.BAD_REQUEST('Cannot delete term with children. Delete or reassign children first.');
    }

    // Delete term (this will cascade to relationships)
    await db.query(
      `DELETE FROM site_${siteId}_terms WHERE id = ?`,
      [termId]
    );

    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'term.deleted', 'term', ?, ?, ?)`,
      [auth.user.id, siteId, termId, term.name, `Deleted term: ${term.name} from ${term.taxonomy_label}`]
    );

    const response = apiSuccess({
      message: 'Term deleted successfully',
      id: termId,
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

