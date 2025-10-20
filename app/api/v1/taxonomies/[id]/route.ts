import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response';
import { authenticate } from '@/lib/api/auth-middleware';
import { getCorsHeaders } from '@/lib/api/middleware';

/**
 * GET /api/v1/taxonomies/:id
 * Get a single taxonomy
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
    const taxonomyId = Number.parseInt(params.id);

    if (Number.isNaN(taxonomyId)) {
      return ApiErrors.BAD_REQUEST('Invalid taxonomy ID');
    }

    // Get taxonomy
    const [taxonomyRows] = await db.query(
      `SELECT * FROM site_${siteId}_taxonomies WHERE id = ?`,
      [taxonomyId]
    );

    const taxonomy = (taxonomyRows as any[])[0];
    if (!taxonomy) {
      return ApiErrors.NOT_FOUND('Taxonomy', taxonomyId);
    }

    // Get term count
    const [termCountRows] = await db.query(
      `SELECT COUNT(*) as term_count FROM site_${siteId}_terms WHERE taxonomy_id = ?`,
      [taxonomyId]
    );
    taxonomy.term_count = (termCountRows as any[])[0].term_count;

    // Get associated post types
    const [postTypeRows] = await db.query(
      `SELECT pt.id, pt.name, pt.label 
       FROM site_${siteId}_post_types pt
       JOIN site_${siteId}_post_type_taxonomies ptt ON pt.id = ptt.post_type_id
       WHERE ptt.taxonomy_id = ?`,
      [taxonomyId]
    );
    taxonomy.post_types = postTypeRows as any[];

    const response = apiSuccess(taxonomy);

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
 * PUT /api/v1/taxonomies/:id
 * Update a taxonomy (full update)
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
      return ApiErrors.FORBIDDEN('You do not have permission to update taxonomies');
    }

    const siteId = auth.user.siteId;
    const taxonomyId = Number.parseInt(params.id);

    if (Number.isNaN(taxonomyId)) {
      return ApiErrors.BAD_REQUEST('Invalid taxonomy ID');
    }

    // Check if taxonomy exists
    const [existingRows] = await db.query(
      `SELECT * FROM site_${siteId}_taxonomies WHERE id = ?`,
      [taxonomyId]
    );

    if ((existingRows as any[]).length === 0) {
      return ApiErrors.NOT_FOUND('Taxonomy', taxonomyId);
    }

    const body = await req.json();
    const {
      label,
      singular_label,
      description = '',
      hierarchical = false,
      public: isPublic = true,
      show_in_menu = true,
      show_in_dashboard = false,
      menu_position = 20,
    } = body;

    // Update taxonomy (name cannot be changed)
    await db.query(
      `UPDATE site_${siteId}_taxonomies 
       SET label = ?, singular_label = ?, description = ?, hierarchical = ?, 
           public = ?, show_in_menu = ?, show_in_dashboard = ?, menu_position = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [label, singular_label, description, hierarchical, isPublic, show_in_menu, show_in_dashboard, menu_position, taxonomyId]
    );

    // Get updated taxonomy
    const [updatedRows] = await db.query(
      `SELECT * FROM site_${siteId}_taxonomies WHERE id = ?`,
      [taxonomyId]
    );

    const taxonomy = (updatedRows as any[])[0];

    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'taxonomy.updated', 'taxonomy', ?, ?, ?)`,
      [auth.user.id, siteId, taxonomyId, taxonomy.name, `Updated taxonomy: ${taxonomy.label}`]
    );

    const response = apiSuccess(taxonomy);

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
 * PATCH /api/v1/taxonomies/:id
 * Partial update of a taxonomy
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
      return ApiErrors.FORBIDDEN('You do not have permission to update taxonomies');
    }

    const siteId = auth.user.siteId;
    const taxonomyId = Number.parseInt(params.id);

    if (Number.isNaN(taxonomyId)) {
      return ApiErrors.BAD_REQUEST('Invalid taxonomy ID');
    }

    // Check if taxonomy exists
    const [existingRows] = await db.query(
      `SELECT * FROM site_${siteId}_taxonomies WHERE id = ?`,
      [taxonomyId]
    );

    if ((existingRows as any[]).length === 0) {
      return ApiErrors.NOT_FOUND('Taxonomy', taxonomyId);
    }

    const body = await req.json();
    const updates: string[] = [];
    const sqlParams: any[] = [];

    // Build dynamic update query
    if (body.label !== undefined) {
      updates.push('label = ?');
      sqlParams.push(body.label);
    }

    if (body.singular_label !== undefined) {
      updates.push('singular_label = ?');
      sqlParams.push(body.singular_label);
    }

    if (body.description !== undefined) {
      updates.push('description = ?');
      sqlParams.push(body.description);
    }

    if (body.hierarchical !== undefined) {
      updates.push('hierarchical = ?');
      sqlParams.push(body.hierarchical);
    }

    if (body.public !== undefined) {
      updates.push('public = ?');
      sqlParams.push(body.public);
    }

    if (body.show_in_menu !== undefined) {
      updates.push('show_in_menu = ?');
      sqlParams.push(body.show_in_menu);
    }

    if (body.show_in_dashboard !== undefined) {
      updates.push('show_in_dashboard = ?');
      sqlParams.push(body.show_in_dashboard);
    }

    if (body.menu_position !== undefined) {
      updates.push('menu_position = ?');
      sqlParams.push(body.menu_position);
    }

    if (updates.length === 0) {
      return ApiErrors.BAD_REQUEST('No fields to update');
    }

    // Always update updated_at
    updates.push('updated_at = NOW()');

    // Add taxonomy ID to params
    sqlParams.push(taxonomyId);

    // Update taxonomy
    await db.query(
      `UPDATE site_${siteId}_taxonomies 
       SET ${updates.join(', ')}
       WHERE id = ?`,
      sqlParams
    );

    // Get updated taxonomy
    const [updatedRows] = await db.query(
      `SELECT * FROM site_${siteId}_taxonomies WHERE id = ?`,
      [taxonomyId]
    );

    const taxonomy = (updatedRows as any[])[0];

    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'taxonomy.updated', 'taxonomy', ?, ?, ?)`,
      [auth.user.id, siteId, taxonomyId, taxonomy.name, `Updated taxonomy: ${taxonomy.label}`]
    );

    const response = apiSuccess(taxonomy);

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
 * DELETE /api/v1/taxonomies/:id
 * Delete a taxonomy
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
      return ApiErrors.FORBIDDEN('You do not have permission to delete taxonomies');
    }

    const siteId = auth.user.siteId;
    const taxonomyId = Number.parseInt(params.id);

    if (Number.isNaN(taxonomyId)) {
      return ApiErrors.BAD_REQUEST('Invalid taxonomy ID');
    }

    // Check if taxonomy exists
    const [taxonomyRows] = await db.query(
      `SELECT * FROM site_${siteId}_taxonomies WHERE id = ?`,
      [taxonomyId]
    );

    const taxonomy = (taxonomyRows as any[])[0];
    if (!taxonomy) {
      return ApiErrors.NOT_FOUND('Taxonomy', taxonomyId);
    }

    // Check if it's a default taxonomy (category or tag)
    if (taxonomy.name === 'category' || taxonomy.name === 'tag') {
      return ApiErrors.BAD_REQUEST('Cannot delete default taxonomies');
    }

    // Delete taxonomy (this will cascade to terms and relationships)
    await db.query(
      `DELETE FROM site_${siteId}_taxonomies WHERE id = ?`,
      [taxonomyId]
    );

    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'taxonomy.deleted', 'taxonomy', ?, ?, ?)`,
      [auth.user.id, siteId, taxonomyId, taxonomy.name, `Deleted taxonomy: ${taxonomy.label}`]
    );

    const response = apiSuccess({
      message: 'Taxonomy deleted successfully',
      id: taxonomyId,
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

