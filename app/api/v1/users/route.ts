import { NextRequest } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { apiSuccess, apiSuccessPaginated, ApiErrors, handleApiError } from '@/lib/api/response';
import { authenticate } from '@/lib/api/auth-middleware';
import { validatePagination } from '@/lib/api/validation';
import { getCorsHeaders } from '@/lib/api/middleware';

/**
 * GET /api/v1/users
 * List all users
 */
export async function GET(req: NextRequest) {
  try {
    // Authentication required
    const auth = await authenticate(req);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    // Check permission
    if (!auth.user.permissions.manage_users) {
      return ApiErrors.FORBIDDEN('You do not have permission to list users');
    }

    const { searchParams } = new URL(req.url);

    // Pagination
    const { page, per_page, offset } = validatePagination(searchParams);

    // Filters
    const search = searchParams.get('search') || '';
    const roleId = searchParams.get('role_id');
    const siteId = searchParams.get('site_id'); // Filter by site assignment

    // Build query
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (u.username LIKE ? OR u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (roleId) {
      whereClause += ' AND u.role_id = ?';
      params.push(roleId);
    }

    // If filtering by site, join with site_users
    let fromClause = 'FROM users u';
    if (siteId) {
      fromClause += ' INNER JOIN site_users su ON u.id = su.user_id AND su.site_id = ?';
      params.push(siteId);
    }

    // Get total count
    const [countResult] = await db.query(
      `SELECT COUNT(DISTINCT u.id) as total ${fromClause} ${whereClause}`,
      params
    );
    const total = (countResult as any[])[0].total;

    // Get users with role info
    const [userRows] = await db.query(
      `SELECT DISTINCT u.id, u.username, u.first_name, u.last_name, u.email, 
              u.role_id, r.name as role_name, r.display_name as role_display_name,
              u.created_at, u.updated_at
       ${fromClause}
       LEFT JOIN roles r ON u.role_id = r.id
       ${whereClause}
       ORDER BY u.username ASC
       LIMIT ? OFFSET ?`,
      [...params, per_page, offset]
    );

    const users = userRows as any[];

    // For each user, get their site assignments
    for (const user of users) {
      const [siteRows] = await db.query(
        `SELECT s.id, s.name, s.display_name, su.role_id, r.name as site_role_name
         FROM site_users su
         JOIN sites s ON su.site_id = s.id
         LEFT JOIN roles r ON su.role_id = r.id
         WHERE su.user_id = ?`,
        [user.id]
      );
      user.sites = siteRows;
      
      // Construct display name
      user.display_name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
      
      // Remove password (even though we didn't select it, be safe)
      delete user.password;
    }

    const totalPages = Math.ceil(total / per_page);
    const response = apiSuccessPaginated(
      users,
      {
        total,
        count: users.length,
        per_page,
        current_page: page,
        total_pages: totalPages,
      },
      `/api/v1/users`
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
 * POST /api/v1/users
 * Create a new user
 */
export async function POST(req: NextRequest) {
  try {
    // Authentication required
    const auth = await authenticate(req);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    // Check permission
    if (!auth.user.permissions.manage_users) {
      return ApiErrors.FORBIDDEN('You do not have permission to create users');
    }

    const body = await req.json();

    // Validate required fields
    if (!body.username) {
      return ApiErrors.BAD_REQUEST('Username is required');
    }

    if (!body.email) {
      return ApiErrors.BAD_REQUEST('Email is required');
    }

    if (!body.password) {
      return ApiErrors.BAD_REQUEST('Password is required');
    }

    if (!body.first_name) {
      return ApiErrors.BAD_REQUEST('First name is required');
    }

    // Check if username already exists
    const [existingUser] = await db.query(
      'SELECT id FROM users WHERE username = ?',
      [body.username]
    );

    if ((existingUser as any[]).length > 0) {
      return ApiErrors.CONFLICT(`Username '${body.username}' already exists`);
    }

    // Check if email already exists
    const [existingEmail] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [body.email]
    );

    if ((existingEmail as any[]).length > 0) {
      return ApiErrors.CONFLICT(`Email '${body.email}' already exists`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Create user
    const [result] = await db.query(
      `INSERT INTO users (username, first_name, last_name, email, password, role_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        body.username,
        body.first_name,
        body.last_name || null,
        body.email,
        hashedPassword,
        body.role_id || 3, // Default to role ID 3 (typically "user" role)
      ]
    );

    const userId = (result as any).insertId;

    // If site assignments provided, add them
    if (body.sites && Array.isArray(body.sites)) {
      for (const site of body.sites) {
        await db.query(
          'INSERT INTO site_users (site_id, user_id, role_id) VALUES (?, ?, ?)',
          [site.site_id, userId, site.role_id || body.role_id || 3]
        );
      }
    }

    // Get created user (without password)
    const [createdRows] = await db.query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.email, 
              u.role_id, r.name as role_name, r.display_name as role_display_name,
              u.created_at, u.updated_at
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [userId]
    );

    const user = (createdRows as any[])[0];

    // Get site assignments
    const [siteRows] = await db.query(
      `SELECT s.id, s.name, s.display_name, su.role_id, r.name as site_role_name
       FROM site_users su
       JOIN sites s ON su.site_id = s.id
       LEFT JOIN roles r ON su.role_id = r.id
       WHERE su.user_id = ?`,
      [userId]
    );
    user.sites = siteRows;
    user.display_name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;

    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'user.created', 'user', ?, ?, ?)`,
      [auth.user.id, auth.user.siteId, userId, user.username, `Created user: ${user.username}`]
    );

    const response = apiSuccess(user, 201);

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

