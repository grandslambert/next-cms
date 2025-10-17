/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT tokens
 */

import { NextRequest } from 'next/server';
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response';
import { validateRequired } from '@/lib/api/validation';
import { generateTokenPair } from '@/lib/api/jwt';
import { getCorsHeaders } from '@/lib/api/middleware';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();

    // Validate required fields
    const validation = validateRequired(body, ['username', 'password']);
    if (!validation.valid) {
      return ApiErrors.VALIDATION_ERROR(
        validation.errors[0].message,
        validation.errors[0].field
      );
    }

    const { username, password } = body;

    // Find user with their role
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.email, u.password, u.role_id, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.username = ? OR u.email = ?`,
      [username, username]
    );

    const user = (rows as any[])[0];
    if (!user) {
      return ApiErrors.UNAUTHORIZED('Invalid username or password');
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return ApiErrors.UNAUTHORIZED('Invalid username or password');
    }

    // Check if user is super admin
    const isSuperAdmin = user.role_name === 'super_admin';
    
    // Get user's primary site
    let siteId = 1;
    let role = user.role_name || 'author';

    if (!isSuperAdmin) {
      // Get user's first site assignment
      const [siteRows] = await db.query(
        `SELECT su.site_id, r.name as role_name
         FROM site_users su
         JOIN roles r ON su.role_id = r.id
         WHERE su.user_id = ?
         ORDER BY su.site_id ASC
         LIMIT 1`,
        [user.id]
      );

      const siteUser = (siteRows as any[])[0];
      if (siteUser) {
        siteId = siteUser.site_id;
        role = siteUser.role_name;
      }
    }

    // Generate JWT tokens
    const tokens = generateTokenPair({
      userId: user.id,
      username: user.username,
      email: user.email,
      role,
      siteId,
    });

    // Log successful login
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_name, details, ip_address, user_agent)
       VALUES (?, ?, 'user.login', 'user', ?, ?, ?, ?)`,
      [
        user.id,
        siteId,
        user.username,
        'User logged in via API',
        req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        req.headers.get('user-agent') || 'unknown',
      ]
    );

    const response = apiSuccess(
      {
        ...tokens,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role,
          site_id: siteId,
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

