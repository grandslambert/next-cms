import { NextRequest } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response';
import { authenticate } from '@/lib/api/auth-middleware';
import { getCorsHeaders } from '@/lib/api/middleware';

/**
 * GET /api/v1/users/:id
 * Get a single user
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

    const userId = Number.parseInt(params.id);

    if (Number.isNaN(userId)) {
      return ApiErrors.BAD_REQUEST('Invalid user ID');
    }

    // Check permission - users can view their own profile, or need manage_users permission
    const isSelf = userId === auth.user.id;
    if (!isSelf && !auth.user.permissions.manage_users) {
      return ApiErrors.FORBIDDEN('You do not have permission to view this user');
    }

    // Get user with role info
    const [userRows] = await db.query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.email, 
              u.role_id, r.name as role_name, r.display_name as role_display_name,
              r.permissions, u.created_at, u.updated_at
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [userId]
    );

    if ((userRows as any[]).length === 0) {
      return ApiErrors.NOT_FOUND('User', userId);
    }

    const user = (userRows as any[])[0];

    // Parse permissions
    if (user.permissions) {
      try {
        user.permissions = typeof user.permissions === 'string' 
          ? JSON.parse(user.permissions) 
          : user.permissions;
      } catch {
        user.permissions = {};
      }
    }

    // Get site assignments
    const [siteRows] = await db.query(
      `SELECT s.id, s.name, s.display_name, su.role_id, r.name as site_role_name, r.display_name as site_role_display_name
       FROM site_users su
       JOIN sites s ON su.site_id = s.id
       LEFT JOIN roles r ON su.role_id = r.id
       WHERE su.user_id = ?`,
      [userId]
    );
    user.sites = siteRows;

    // Construct display name
    user.display_name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;

    const response = apiSuccess(user);

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
 * PUT /api/v1/users/:id
 * Update a user (full update)
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

    const userId = Number.parseInt(params.id);

    if (Number.isNaN(userId)) {
      return ApiErrors.BAD_REQUEST('Invalid user ID');
    }

    // Check permission - users can update their own profile (limited), or need manage_users permission
    const isSelf = userId === auth.user.id;
    if (!isSelf && !auth.user.permissions.manage_users) {
      return ApiErrors.FORBIDDEN('You do not have permission to update this user');
    }

    // Check if user exists
    const [existingRows] = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if ((existingRows as any[]).length === 0) {
      return ApiErrors.NOT_FOUND('User', userId);
    }

    const body = await req.json();

    // Validate required fields
    if (!body.username) {
      return ApiErrors.BAD_REQUEST('Username is required');
    }

    if (!body.email) {
      return ApiErrors.BAD_REQUEST('Email is required');
    }

    if (!body.first_name) {
      return ApiErrors.BAD_REQUEST('First name is required');
    }

    // Check for duplicate username
    const [duplicateUser] = await db.query(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [body.username, userId]
    );

    if ((duplicateUser as any[]).length > 0) {
      return ApiErrors.CONFLICT(`Username '${body.username}' already exists`);
    }

    // Check for duplicate email
    const [duplicateEmail] = await db.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [body.email, userId]
    );

    if ((duplicateEmail as any[]).length > 0) {
      return ApiErrors.CONFLICT(`Email '${body.email}' already exists`);
    }

    // Update user
    let updateQuery = `UPDATE users 
                       SET username = ?, first_name = ?, last_name = ?, email = ?`;
    const updateParams: any[] = [body.username, body.first_name, body.last_name || null, body.email];

    // Only admins can change role
    if (!isSelf && body.role_id !== undefined) {
      updateQuery += ', role_id = ?';
      updateParams.push(body.role_id);
    }

    // Update password if provided
    if (body.password) {
      const hashedPassword = await bcrypt.hash(body.password, 10);
      updateQuery += ', password = ?';
      updateParams.push(hashedPassword);
    }

    updateQuery += ' WHERE id = ?';
    updateParams.push(userId);

    await db.query(updateQuery, updateParams);

    // Update site assignments if provided (admin only)
    if (!isSelf && body.sites && Array.isArray(body.sites)) {
      // Remove existing site assignments
      await db.query('DELETE FROM site_users WHERE user_id = ?', [userId]);

      // Add new assignments
      for (const site of body.sites) {
        await db.query(
          'INSERT INTO site_users (site_id, user_id, role_id) VALUES (?, ?, ?)',
          [site.site_id, userId, site.role_id || body.role_id]
        );
      }
    }

    // Get updated user
    const [updatedRows] = await db.query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.email, 
              u.role_id, r.name as role_name, r.display_name as role_display_name,
              u.created_at, u.updated_at
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [userId]
    );

    const user = (updatedRows as any[])[0];

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
       VALUES (?, ?, 'user.updated', 'user', ?, ?, ?)`,
      [auth.user.id, auth.user.siteId, userId, user.username, `Updated user: ${user.username}`]
    );

    const response = apiSuccess(user);

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
 * PATCH /api/v1/users/:id
 * Partially update a user
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

    const userId = Number.parseInt(params.id);

    if (Number.isNaN(userId)) {
      return ApiErrors.BAD_REQUEST('Invalid user ID');
    }

    // Check permission - users can update their own profile (limited), or need manage_users permission
    const isSelf = userId === auth.user.id;
    if (!isSelf && !auth.user.permissions.manage_users) {
      return ApiErrors.FORBIDDEN('You do not have permission to update this user');
    }

    // Check if user exists
    const [existingRows] = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if ((existingRows as any[]).length === 0) {
      return ApiErrors.NOT_FOUND('User', userId);
    }

    const body = await req.json();
    const updates: string[] = [];
    const sqlParams: any[] = [];

    // Build dynamic update query
    if (body.username !== undefined) {
      // Check for duplicate
      const [duplicateUser] = await db.query(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [body.username, userId]
      );

      if ((duplicateUser as any[]).length > 0) {
        return ApiErrors.CONFLICT(`Username '${body.username}' already exists`);
      }

      updates.push('username = ?');
      sqlParams.push(body.username);
    }

    if (body.first_name !== undefined) {
      updates.push('first_name = ?');
      sqlParams.push(body.first_name);
    }

    if (body.last_name !== undefined) {
      updates.push('last_name = ?');
      sqlParams.push(body.last_name);
    }

    if (body.email !== undefined) {
      // Check for duplicate
      const [duplicateEmail] = await db.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [body.email, userId]
      );

      if ((duplicateEmail as any[]).length > 0) {
        return ApiErrors.CONFLICT(`Email '${body.email}' already exists`);
      }

      updates.push('email = ?');
      sqlParams.push(body.email);
    }

    // Only admins can change role
    if (!isSelf && body.role_id !== undefined) {
      updates.push('role_id = ?');
      sqlParams.push(body.role_id);
    }

    // Update password if provided
    if (body.password) {
      const hashedPassword = await bcrypt.hash(body.password, 10);
      updates.push('password = ?');
      sqlParams.push(hashedPassword);
    }

    if (updates.length === 0 && (!body.sites || !Array.isArray(body.sites))) {
      return ApiErrors.BAD_REQUEST('No fields to update');
    }

    // Update user fields if any
    if (updates.length > 0) {
      sqlParams.push(userId);
      await db.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        sqlParams
      );
    }

    // Update site assignments if provided (admin only)
    if (!isSelf && body.sites && Array.isArray(body.sites)) {
      // Remove existing site assignments
      await db.query('DELETE FROM site_users WHERE user_id = ?', [userId]);

      // Add new assignments
      for (const site of body.sites) {
        await db.query(
          'INSERT INTO site_users (site_id, user_id, role_id) VALUES (?, ?, ?)',
          [site.site_id, userId, site.role_id]
        );
      }
    }

    // Get updated user
    const [updatedRows] = await db.query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.email, 
              u.role_id, r.name as role_name, r.display_name as role_display_name,
              u.created_at, u.updated_at
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [userId]
    );

    const user = (updatedRows as any[])[0];

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
       VALUES (?, ?, 'user.updated', 'user', ?, ?, ?)`,
      [auth.user.id, auth.user.siteId, userId, user.username, `Updated user: ${user.username}`]
    );

    const response = apiSuccess(user);

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
 * DELETE /api/v1/users/:id
 * Delete a user
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
    if (!auth.user.permissions.manage_users) {
      return ApiErrors.FORBIDDEN('You do not have permission to delete users');
    }

    const userId = Number.parseInt(params.id);

    if (Number.isNaN(userId)) {
      return ApiErrors.BAD_REQUEST('Invalid user ID');
    }

    // Prevent self-deletion
    if (userId === auth.user.id) {
      return ApiErrors.BAD_REQUEST('You cannot delete your own account');
    }

    // Check if user exists
    const [userRows] = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if ((userRows as any[]).length === 0) {
      return ApiErrors.NOT_FOUND('User', userId);
    }

    const user = (userRows as any[])[0];

    // Delete user (site_users will cascade)
    await db.query('DELETE FROM users WHERE id = ?', [userId]);

    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'user.deleted', 'user', ?, ?, ?)`,
      [auth.user.id, auth.user.siteId, userId, user.username, `Deleted user: ${user.username}`]
    );

    const response = apiSuccess({
      message: 'User deleted successfully',
      id: userId,
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

