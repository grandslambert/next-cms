/**
 * Single Site API Endpoints
 * 
 * Handles operations on individual sites.
 * 
 * @requires manage_sites permission (or is_super_admin)
 */

import { NextRequest } from 'next/server';
import { 
  apiSuccess, 
  ApiErrors 
} from '@/lib/api/response';
import { 
  validateRequired 
} from '@/lib/api/validation';
import { authenticate } from '@/lib/api/auth-middleware';
import db from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';

/**
 * GET /api/v1/sites/:id
 * 
 * Get a single site with its statistics
 * 
 * @requires manage_sites permission (or is_super_admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate
    const auth = await authenticate(request);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    // Check permission
    if (!auth.user.permissions.manage_sites && !auth.user.permissions.is_super_admin) {
      return ApiErrors.FORBIDDEN('You do not have permission to manage sites');
    }

    const siteId = Number.parseInt(params.id, 10);
    if (Number.isNaN(siteId)) {
      return ApiErrors.BAD_REQUEST('Invalid site ID');
    }

    // Get site
    const [siteRows] = await db.query(
      `SELECT id, name, display_name, domain, description, is_active, created_at, updated_at
       FROM sites WHERE id = ?`,
      [siteId]
    );

    const site = (siteRows as any[])[0];
    if (!site) {
      return ApiErrors.NOT_FOUND('Site not found');
    }

    // Get user count for this site
    const [userCountRows] = await db.query(
      'SELECT COUNT(*) as count FROM site_users WHERE site_id = ?',
      [siteId]
    );
    const userCount = (userCountRows as any[])[0];

    // Add statistics
    const siteWithStats = {
      ...site,
      stats: {
        users: userCount?.count || 0
      }
    };

    return apiSuccess(siteWithStats);

  } catch (error: any) {
    console.error(`Error in GET /api/v1/sites/${params.id}:`, error);
    return ApiErrors.INTERNAL_ERROR(error.message);
  }
}

/**
 * PUT /api/v1/sites/:id
 * 
 * Update a site (full update)
 * 
 * Request Body:
 * - name: string (required)
 * - display_name: string (required)
 * - domain: string (optional)
 * - description: string (optional)
 * - is_active: boolean (required)
 * 
 * @requires manage_sites permission (or is_super_admin)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate
    const auth = await authenticate(request);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    // Check permission
    if (!auth.user.permissions.manage_sites && !auth.user.permissions.is_super_admin) {
      return ApiErrors.FORBIDDEN('You do not have permission to manage sites');
    }

    const siteId = Number.parseInt(params.id, 10);
    if (Number.isNaN(siteId)) {
      return ApiErrors.BAD_REQUEST('Invalid site ID');
    }

    // Check if site exists
    const [existingRows] = await db.query(
      'SELECT id, name FROM sites WHERE id = ?',
      [siteId]
    );

    const existing = (existingRows as any[])[0];
    if (!existing) {
      return ApiErrors.NOT_FOUND('Site not found');
    }

    // Parse body
    const body = await request.json();

    // Validate required fields for PUT
    const validation = validateRequired(body, ['name', 'display_name', 'is_active']);
    if (!validation.valid) {
      return ApiErrors.VALIDATION_ERROR(validation.errors[0].message, validation.errors[0].field);
    }

    const {
      name,
      display_name,
      domain = null,
      description = null,
      is_active
    } = body;

    // Validate name format
    if (!/^[a-z0-9_]+$/.test(name)) {
      return ApiErrors.VALIDATION_ERROR(
        'Site name must contain only lowercase letters, numbers, and underscores',
        'name'
      );
    }

    // Check for duplicate name (excluding current site)
    const [duplicateNameRows] = await db.query(
      'SELECT id FROM sites WHERE name = ? AND id != ?',
      [name, siteId]
    );
    const duplicateName = duplicateNameRows as any[];
    if (duplicateName.length > 0) {
      return ApiErrors.CONFLICT('A site with this name already exists');
    }

    // Check for duplicate domain (excluding current site)
    if (domain) {
      const [duplicateDomainRows] = await db.query(
        'SELECT id FROM sites WHERE domain = ? AND id != ?',
        [domain, siteId]
      );
      const duplicateDomain = duplicateDomainRows as any[];
      if (duplicateDomain.length > 0) {
        return ApiErrors.CONFLICT('A site with this domain already exists');
      }
    }

    // Update site
    await db.query(
      `UPDATE sites 
       SET name = ?, display_name = ?, domain = ?, description = ?, is_active = ?
       WHERE id = ?`,
      [name, display_name, domain, description, is_active ? 1 : 0, siteId]
    );

    // Get updated site
    const [updatedRows] = await db.query(
      `SELECT id, name, display_name, domain, description, is_active, created_at, updated_at
       FROM sites WHERE id = ?`,
      [siteId]
    );
    const updated = (updatedRows as any[])[0];

    // Log activity
    await logActivity({
      userId: auth.user.id,
      action: 'site_updated',
      entityType: 'site',
      entityId: siteId,
      entityName: name,
      details: { site_name: name }
    });

    return apiSuccess(updated, 200, { message: 'Site updated successfully' });

  } catch (error: any) {
    console.error(`Error in PUT /api/v1/sites/${params.id}:`, error);
    return ApiErrors.INTERNAL_ERROR(error.message);
  }
}

/**
 * PATCH /api/v1/sites/:id
 * 
 * Partially update a site
 * 
 * Request Body (all optional):
 * - name: string
 * - display_name: string
 * - domain: string
 * - description: string
 * - is_active: boolean
 * 
 * @requires manage_sites permission (or is_super_admin)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate
    const auth = await authenticate(request);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    // Check permission
    if (!auth.user.permissions.manage_sites && !auth.user.permissions.is_super_admin) {
      return ApiErrors.FORBIDDEN('You do not have permission to manage sites');
    }

    const siteId = Number.parseInt(params.id, 10);
    if (Number.isNaN(siteId)) {
      return ApiErrors.BAD_REQUEST('Invalid site ID');
    }

    // Check if site exists
    const [existingRows] = await db.query(
      'SELECT id, name, display_name, domain, description, is_active FROM sites WHERE id = ?',
      [siteId]
    );

    const existing = (existingRows as any[])[0];
    if (!existing) {
      return ApiErrors.NOT_FOUND('Site not found');
    }

    // Parse body
    const body = await request.json();

    // Build update query dynamically
    const updates: string[] = [];
    const queryParams: any[] = [];

    if (body.name !== undefined) {
      // Validate name format
      if (!/^[a-z0-9_]+$/.test(body.name)) {
        return ApiErrors.VALIDATION_ERROR(
          'Site name must contain only lowercase letters, numbers, and underscores',
          'name'
        );
      }

      // Check for duplicate name
      const [duplicateNameRows] = await db.query(
        'SELECT id FROM sites WHERE name = ? AND id != ?',
        [body.name, siteId]
      );
      const duplicateName = duplicateNameRows as any[];
      if (duplicateName.length > 0) {
        return ApiErrors.CONFLICT('A site with this name already exists');
      }

      updates.push('name = ?');
      queryParams.push(body.name);
    }

    if (body.display_name !== undefined) {
      updates.push('display_name = ?');
      queryParams.push(body.display_name);
    }

    if (body.domain !== undefined) {
      // Check for duplicate domain
      if (body.domain) {
        const [duplicateDomainRows] = await db.query(
          'SELECT id FROM sites WHERE domain = ? AND id != ?',
          [body.domain, siteId]
        );
        const duplicateDomain = duplicateDomainRows as any[];
        if (duplicateDomain.length > 0) {
          return ApiErrors.CONFLICT('A site with this domain already exists');
        }
      }

      updates.push('domain = ?');
      queryParams.push(body.domain);
    }

    if (body.description !== undefined) {
      updates.push('description = ?');
      queryParams.push(body.description);
    }

    if (body.is_active !== undefined) {
      updates.push('is_active = ?');
      queryParams.push(body.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return ApiErrors.VALIDATION_ERROR('No valid fields to update', 'body');
    }

    // Update site
    queryParams.push(siteId);
    await db.query(
      `UPDATE sites SET ${updates.join(', ')} WHERE id = ?`,
      queryParams
    );

    // Get updated site
    const [updatedRows] = await db.query(
      `SELECT id, name, display_name, domain, description, is_active, created_at, updated_at
       FROM sites WHERE id = ?`,
      [siteId]
    );
    const updated = (updatedRows as any[])[0];

    // Log activity
    await logActivity({
      userId: auth.user.id,
      action: 'site_updated',
      entityType: 'site',
      entityId: siteId,
      entityName: updated.name,
      details: { site_name: updated.name }
    });

    return apiSuccess(updated, 200, { message: 'Site updated successfully' });

  } catch (error: any) {
    console.error(`Error in PATCH /api/v1/sites/${params.id}:`, error);
    return ApiErrors.INTERNAL_ERROR(error.message);
  }
}

/**
 * DELETE /api/v1/sites/:id
 * 
 * Delete a site
 * 
 * WARNING: This will cascade delete all site-specific data!
 * 
 * @requires manage_sites permission (or is_super_admin)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate
    const auth = await authenticate(request);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    // Check permission
    if (!auth.user.permissions.manage_sites && !auth.user.permissions.is_super_admin) {
      return ApiErrors.FORBIDDEN('You do not have permission to manage sites');
    }

    const siteId = Number.parseInt(params.id, 10);
    if (Number.isNaN(siteId)) {
      return ApiErrors.BAD_REQUEST('Invalid site ID');
    }

    // Don't allow deletion of site 1 (default site)
    if (siteId === 1) {
      return ApiErrors.FORBIDDEN('Cannot delete the default site');
    }

    // Check if site exists
    const [existingRows] = await db.query(
      'SELECT id, name FROM sites WHERE id = ?',
      [siteId]
    );

    const existing = (existingRows as any[])[0];
    if (!existing) {
      return ApiErrors.NOT_FOUND('Site not found');
    }

    // Delete site (cascade will handle related data)
    await db.query('DELETE FROM sites WHERE id = ?', [siteId]);

    // Log activity
    await logActivity({
      userId: auth.user.id,
      action: 'site_deleted',
      entityType: 'site',
      entityId: siteId,
      entityName: existing.name,
      details: { site_name: existing.name }
    });

    return apiSuccess(null, 200, { message: 'Site deleted successfully' });

  } catch (error: any) {
    console.error(`Error in DELETE /api/v1/sites/${params.id}:`, error);
    return ApiErrors.INTERNAL_ERROR(error.message);
  }
}

/**
 * OPTIONS /api/v1/sites/:id
 * 
 * Handle preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
