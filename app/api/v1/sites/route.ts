/**
 * Sites API Endpoints
 * 
 * Handles multi-site management operations.
 * 
 * @requires manage_sites permission (or is_super_admin)
 */

import { NextRequest } from 'next/server';
import { 
  apiSuccess, 
  apiSuccessPaginated, 
  ApiErrors 
} from '@/lib/api/response';
import { 
  validatePagination, 
  validateRequired 
} from '@/lib/api/validation';
import { authenticate } from '@/lib/api/auth-middleware';
import db from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';

/**
 * GET /api/v1/sites
 * 
 * List all sites with pagination and filtering
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - per_page: Items per page (default: 10, max: 100)
 * - search: Search in name, display_name, domain
 * - is_active: Filter by active status (true/false)
 * 
 * @requires manage_sites permission (or is_super_admin)
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    
    // Validate pagination
    const { page, per_page, offset, errors: paginationErrors } = validatePagination(searchParams);
    if (paginationErrors.length > 0) {
      return ApiErrors.VALIDATION_ERROR(paginationErrors[0].message, paginationErrors[0].field);
    }

    // Get filters
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('is_active');

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      conditions.push('(name LIKE ? OR display_name LIKE ? OR domain LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (isActive !== null) {
      if (isActive === 'true' || isActive === '1') {
        conditions.push('is_active = 1');
      } else if (isActive === 'false' || isActive === '0') {
        conditions.push('is_active = 0');
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM sites ${whereClause}`;
    const [countRows] = await db.query(countQuery, params);
    const countResult = (countRows as any[])[0];
    const total = countResult?.total || 0;

    // Get paginated sites
    const sitesQuery = `
      SELECT 
        id,
        name,
        display_name,
        domain,
        description,
        is_active,
        created_at,
        updated_at
      FROM sites
      ${whereClause}
      ORDER BY id ASC
      LIMIT ? OFFSET ?
    `;

    const [sitesRows] = await db.query(sitesQuery, [...params, per_page, offset]);
    const sites = sitesRows as any[];

    return apiSuccessPaginated(sites, {
      total,
      count: sites.length,
      per_page,
      current_page: page,
      total_pages: Math.ceil(total / per_page)
    }, '/api/v1/sites');

  } catch (error: any) {
    console.error('Error in GET /api/v1/sites:', error);
    return ApiErrors.INTERNAL_ERROR(error.message);
  }
}

/**
 * POST /api/v1/sites
 * 
 * Create a new site
 * 
 * Request Body:
 * - name: string (required) - URL-safe site identifier
 * - display_name: string (required) - Human-readable site name
 * - domain: string (optional) - Site domain
 * - description: string (optional) - Site description
 * - is_active: boolean (optional, default: true)
 * 
 * @requires manage_sites permission (or is_super_admin)
 */
export async function POST(request: NextRequest) {
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

    // Parse body
    const body = await request.json();

    // Validate required fields
    const validation = validateRequired(body, ['name', 'display_name']);
    if (!validation.valid) {
      return ApiErrors.VALIDATION_ERROR(validation.errors[0].message, validation.errors[0].field);
    }

    const {
      name,
      display_name,
      domain = null,
      description = null,
      is_active = true
    } = body;

    // Validate name format (must be URL-safe)
    if (!/^[a-z0-9_]+$/.test(name)) {
      return ApiErrors.VALIDATION_ERROR(
        'Site name must contain only lowercase letters, numbers, and underscores',
        'name'
      );
    }

    // Check for duplicate name
    const [existingNameRows] = await db.query(
      'SELECT id FROM sites WHERE name = ?',
      [name]
    );
    const existingName = existingNameRows as any[];
    if (existingName.length > 0) {
      return ApiErrors.CONFLICT('A site with this name already exists');
    }

    // Check for duplicate domain (if provided)
    if (domain) {
      const [existingDomainRows] = await db.query(
        'SELECT id FROM sites WHERE domain = ?',
        [domain]
      );
      const existingDomain = existingDomainRows as any[];
      if (existingDomain.length > 0) {
        return ApiErrors.CONFLICT('A site with this domain already exists');
      }
    }

    // Create site
    const [result] = await db.query(
      `INSERT INTO sites (name, display_name, domain, description, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [name, display_name, domain, description, is_active ? 1 : 0]
    );

    const insertResult = result as any;
    const siteId = insertResult.insertId;

    // Get the created site
    const [siteRows] = await db.query(
      `SELECT id, name, display_name, domain, description, is_active, created_at, updated_at
       FROM sites WHERE id = ?`,
      [siteId]
    );
    const site = (siteRows as any[])[0];

    // Log activity
    await logActivity({
      userId: auth.user.id,
      action: 'site_created',
      entityType: 'site',
      entityId: siteId,
      entityName: name,
      details: { site_name: name }
    });

    return apiSuccess(site, 201, { message: 'Site created successfully' });

  } catch (error: any) {
    console.error('Error in POST /api/v1/sites:', error);
    return ApiErrors.INTERNAL_ERROR(error.message);
  }
}

/**
 * OPTIONS /api/v1/sites
 * 
 * Handle preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
