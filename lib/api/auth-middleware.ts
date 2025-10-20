/**
 * Authentication Middleware for REST API
 */

import { NextRequest } from 'next/server';
import { verifyToken, isTokenBlacklisted } from './jwt';
import { getBearerToken, getApiKey } from './middleware';
import db from '@/lib/db';

export interface AuthenticatedRequest {
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
    siteId: number;
    permissions: Record<string, boolean>;
  };
  token: string;
}

/**
 * Authenticate request using JWT token
 */
export async function authenticateJWT(
  req: NextRequest
): Promise<AuthenticatedRequest | null> {
  const token = getBearerToken(req);

  if (!token) {
    return null;
  }

  // Check if token is blacklisted
  if (isTokenBlacklisted(token)) {
    return null;
  }

  // Verify token
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  // Ensure it's an access token
  if (payload.type !== 'access') {
    return null;
  }

  // Verify user still exists and get role permissions
  const [userRows] = await db.query(
    `SELECT u.id, u.username, u.email, u.role_id, r.permissions 
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.id = ?`,
    [payload.userId]
  );

  const user = (userRows as any[])[0];
  if (!user) {
    return null;
  }

  // Parse permissions from JSON
  let permissions: Record<string, boolean> = {};
  try {
    permissions = typeof user.permissions === 'string' 
      ? JSON.parse(user.permissions) 
      : user.permissions || {};
  } catch {
    permissions = {};
  }

  return {
    user: {
      id: payload.userId,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      siteId: payload.siteId,
      permissions,
    },
    token,
  };
}

/**
 * Authenticate request using API key
 */
export async function authenticateApiKey(
  req: NextRequest
): Promise<AuthenticatedRequest | null> {
  const apiKey = getApiKey(req);

  if (!apiKey) {
    return null;
  }

  // Look up API key in database with role permissions
  const [keyRows] = await db.query(
    `SELECT ak.*, u.username, u.email, u.role_id, r.name as role_name, r.permissions
     FROM api_keys ak
     JOIN users u ON ak.user_id = u.id
     JOIN roles r ON u.role_id = r.id
     WHERE ak.key_value = ? 
     AND ak.is_active = true 
     AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
    [apiKey]
  );

  const keyRecord = (keyRows as any[])[0];
  if (!keyRecord) {
    return null;
  }

  // Update last_used_at
  await db.query(
    'UPDATE api_keys SET last_used_at = NOW(), usage_count = usage_count + 1 WHERE id = ?',
    [keyRecord.id]
  );

  // Parse permissions from JSON
  let permissions: Record<string, boolean> = {};
  try {
    permissions = typeof keyRecord.permissions === 'string' 
      ? JSON.parse(keyRecord.permissions) 
      : keyRecord.permissions || {};
  } catch {
    permissions = {};
  }

  return {
    user: {
      id: keyRecord.user_id,
      username: keyRecord.username,
      email: keyRecord.email,
      role: keyRecord.role_name || 'user',
      siteId: keyRecord.site_id || 1,
      permissions,
    },
    token: apiKey,
  };
}

/**
 * Authenticate request (try JWT first, then API key)
 */
export async function authenticate(
  req: NextRequest
): Promise<AuthenticatedRequest | null> {
  // Try JWT authentication first
  const jwtAuth = await authenticateJWT(req);
  if (jwtAuth) {
    return jwtAuth;
  }

  // Try API key authentication
  const apiKeyAuth = await authenticateApiKey(req);
  if (apiKeyAuth) {
    return apiKeyAuth;
  }

  return null;
}

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireAuth(req: NextRequest): Promise<AuthenticatedRequest> {
  const auth = await authenticate(req);
  
  if (!auth) {
    throw new Error('Authentication required');
  }

  return auth;
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthenticatedRequest['user'], requiredRole: string): boolean {
  const roleHierarchy: Record<string, number> = {
    super_admin: 100,
    admin: 80,
    editor: 60,
    author: 40,
    contributor: 20,
    guest: 0,
  };

  const userLevel = roleHierarchy[user.role] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Require specific role
 */
export function requireRole(
  user: AuthenticatedRequest['user'],
  requiredRole: string
): void {
  if (!hasRole(user, requiredRole)) {
    throw new Error(`Role '${requiredRole}' required`);
  }
}

/**
 * Check if user has permission
 */
export async function hasPermission(
  userId: number,
  siteId: number,
  permission: string
): Promise<boolean> {
  const [result] = await db.query(
    `SELECT COUNT(*) as count
     FROM user_permissions up
     JOIN role_permissions rp ON up.role_id = rp.role_id
     WHERE up.user_id = ? 
     AND up.site_id = ?
     AND rp.permission = ?`,
    [userId, siteId, permission]
  );

  return result?.count > 0;
}

