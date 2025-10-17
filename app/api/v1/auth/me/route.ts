/**
 * GET /api/v1/auth/me
 * Get current authenticated user information
 */

import { NextRequest } from 'next/server';
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response';
import { authenticate } from '@/lib/api/auth-middleware';
import { getCorsHeaders } from '@/lib/api/middleware';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticate(req);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    // Get full user details with role
    const [userRows] = await db.query(
      `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.created_at, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [auth.user.id]
    );

    const user = (userRows as any[])[0];
    if (!user) {
      return ApiErrors.NOT_FOUND('User');
    }

    const isSuperAdmin = user.role_name === 'super_admin';
    const displayName = `${user.first_name} ${user.last_name}`.trim() || user.username;

    // Get user's site assignments
    const [siteRows] = await db.query(
      `SELECT su.site_id, s.name as site_name, r.name as role_name
       FROM site_users su
       JOIN sites s ON su.site_id = s.id
       JOIN roles r ON su.role_id = r.id
       WHERE su.user_id = ?
       ORDER BY s.name`,
      [auth.user.id]
    );
    const sites = siteRows as any[];

    const response = apiSuccess(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        display_name: displayName,
        is_super_admin: isSuperAdmin,
        current_site_id: auth.user.siteId,
        current_role: auth.user.role,
        sites: isSuperAdmin ? [] : sites,
        created_at: user.created_at,
      },
      200
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

export async function OPTIONS(req: NextRequest) {
  const headers = getCorsHeaders();
  return new Response(null, {
    status: 204,
    headers,
  });
}

