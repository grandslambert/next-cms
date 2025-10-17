/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */

import { NextRequest } from 'next/server';
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response';
import { validateRequired } from '@/lib/api/validation';
import { verifyToken, generateTokenPair, isTokenBlacklisted } from '@/lib/api/jwt';
import { getCorsHeaders } from '@/lib/api/middleware';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();

    // Validate required fields
    const validation = validateRequired(body, ['refresh_token']);
    if (!validation.valid) {
      return ApiErrors.VALIDATION_ERROR(
        validation.errors[0].message,
        validation.errors[0].field
      );
    }

    const { refresh_token } = body;

    // Check if token is blacklisted
    if (isTokenBlacklisted(refresh_token)) {
      return ApiErrors.INVALID_TOKEN('Token has been revoked');
    }

    // Verify refresh token
    const payload = verifyToken(refresh_token);
    if (!payload) {
      return ApiErrors.INVALID_TOKEN('Invalid or expired refresh token');
    }

    // Ensure it's a refresh token
    if (payload.type !== 'refresh') {
      return ApiErrors.INVALID_TOKEN('Invalid token type. Expected refresh token');
    }

    // Verify user still exists
    const [userRows] = await db.query(
      'SELECT id, username, email FROM users WHERE id = ?',
      [payload.userId]
    );

    const user = (userRows as any[])[0];
    if (!user) {
      return ApiErrors.UNAUTHORIZED('User not found');
    }

    // Generate new token pair
    const tokens = generateTokenPair({
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      siteId: payload.siteId,
    });

    const response = apiSuccess(
      {
        ...tokens,
        user: {
          id: payload.userId,
          username: payload.username,
          email: payload.email,
          role: payload.role,
          site_id: payload.siteId,
        },
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

