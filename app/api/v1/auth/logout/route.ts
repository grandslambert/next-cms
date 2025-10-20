/**
 * POST /api/v1/auth/logout
 * Logout user and blacklist token
 */

import { NextRequest } from 'next/server';
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response';
import { blacklistToken } from '@/lib/api/jwt';
import { getBearerToken, getCorsHeaders } from '@/lib/api/middleware';
import { authenticate } from '@/lib/api/auth-middleware';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticate(req);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    // Get token
    const token = getBearerToken(req);
    if (token) {
      // Blacklist the token
      blacklistToken(token);
    }

    // Log logout
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, details, ip_address, user_agent)
       VALUES (?, ?, 'user.logout', 'user', 'User logged out via API', ?, ?)`,
      [
        auth.user.id,
        auth.user.siteId,
        req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        req.headers.get('user-agent') || 'unknown',
      ]
    );

    const response = apiSuccess(
      {
        message: 'Logged out successfully',
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

