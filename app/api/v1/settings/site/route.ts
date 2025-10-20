/**
 * Site Settings API Endpoints
 * 
 * Handles site-specific settings for the current site.
 * 
 * @requires manage_settings permission (or is_super_admin)
 */

import { NextRequest } from 'next/server';
import { 
  apiSuccessPaginated, 
  ApiErrors 
} from '@/lib/api/response';
import { 
  validatePagination 
} from '@/lib/api/validation';
import { authenticate } from '@/lib/api/auth-middleware';
import db from '@/lib/db';

/**
 * GET /api/v1/settings/site
 * 
 * List all settings for the current site with pagination
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - per_page: Items per page (default: 50, max: 100)
 * - search: Search in setting_key
 * 
 * @requires manage_settings permission (or is_super_admin)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const auth = await authenticate(request);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    // Check permission
    if (!auth.user.permissions.manage_settings && !auth.user.permissions.is_super_admin) {
      return ApiErrors.FORBIDDEN('You do not have permission to manage settings');
    }

    const siteId = auth.user.siteId;
    const { searchParams } = new URL(request.url);
    
    // Validate pagination
    const { page, per_page, offset, errors: paginationErrors } = validatePagination(searchParams);
    if (paginationErrors.length > 0) {
      return ApiErrors.VALIDATION_ERROR(paginationErrors[0].message, paginationErrors[0].field);
    }

    // Get search filter
    const search = searchParams.get('search') || '';

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      conditions.push('setting_key LIKE ?');
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM site_${siteId}_settings ${whereClause}`;
    const [countRows] = await db.query(countQuery, params);
    const countResult = (countRows as any[])[0];
    const total = countResult?.total || 0;

    // Get paginated settings
    const settingsQuery = `
      SELECT 
        id,
        setting_key,
        setting_value,
        setting_type,
        created_at,
        updated_at
      FROM site_${siteId}_settings
      ${whereClause}
      ORDER BY setting_key ASC
      LIMIT ? OFFSET ?
    `;

    const [settingsRows] = await db.query(settingsQuery, [...params, per_page, offset]);
    const settings = settingsRows as any[];

    // Parse setting values based on type
    const parsedSettings = settings.map((setting: any) => {
      let parsed_value = setting.setting_value;
      
      try {
        if (setting.setting_type === 'boolean') {
          parsed_value = setting.setting_value === '1' || setting.setting_value === 'true';
        } else if (setting.setting_type === 'number') {
          parsed_value = Number.parseFloat(setting.setting_value);
        } else if (setting.setting_type === 'json') {
          parsed_value = JSON.parse(setting.setting_value);
        }
      } catch {
        // If parsing fails, keep the original string value
      }

      return {
        ...setting,
        parsed_value
      };
    });

    return apiSuccessPaginated(parsedSettings, {
      total,
      count: parsedSettings.length,
      per_page,
      current_page: page,
      total_pages: Math.ceil(total / per_page)
    }, '/api/v1/settings/site');

  } catch (error: any) {
    console.error('Error in GET /api/v1/settings/site:', error);
    return ApiErrors.INTERNAL_ERROR(error.message);
  }
}

/**
 * OPTIONS /api/v1/settings/site
 * 
 * Handle preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

