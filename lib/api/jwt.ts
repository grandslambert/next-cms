/**
 * JWT Token Utilities for REST API
 */

import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';

const JWT_SECRET: Secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'; // 1 hour
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // 7 days

export interface JwtPayload {
  userId: number;
  username: string;
  email: string;
  role: string;
  siteId: number;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

/**
 * Generate access token
 */
export function generateAccessToken(payload: Omit<JwtPayload, 'type'>): string {
  const tokenPayload = {
    ...payload,
    type: 'access' as const,
  };

  return jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'nextcms-api',
    audience: 'nextcms',
  } as SignOptions);
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload: Omit<JwtPayload, 'type'>): string {
  const tokenPayload = {
    ...payload,
    type: 'refresh' as const,
  };

  return jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'nextcms-api',
    audience: 'nextcms',
  } as SignOptions);
}

/**
 * Generate token pair (access + refresh)
 */
export function generateTokenPair(payload: Omit<JwtPayload, 'type'>): TokenPair {
  const access_token = generateAccessToken(payload);
  const refresh_token = generateRefreshToken(payload);

  // Calculate expires_in in seconds
  const expiresIn = JWT_EXPIRES_IN.endsWith('h')
    ? Number.parseInt(JWT_EXPIRES_IN) * 3600
    : JWT_EXPIRES_IN.endsWith('m')
    ? Number.parseInt(JWT_EXPIRES_IN) * 60
    : JWT_EXPIRES_IN.endsWith('d')
    ? Number.parseInt(JWT_EXPIRES_IN) * 86400
    : 3600;

  return {
    access_token,
    refresh_token,
    token_type: 'Bearer',
    expires_in: expiresIn,
  };
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'nextcms-api',
      audience: 'nextcms',
    }) as JwtPayload;

    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;

  const payload = decoded as any;
  if (!payload.exp) return true;

  return Date.now() >= payload.exp * 1000;
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  const decoded = decodeToken(token);
  if (!decoded) return null;

  const payload = decoded as any;
  if (!payload.exp) return null;

  return new Date(payload.exp * 1000);
}

// Token blacklist (in-memory - use Redis in production)
const tokenBlacklist = new Set<string>();

/**
 * Add token to blacklist (for logout)
 */
export function blacklistToken(token: string): void {
  tokenBlacklist.add(token);

  // Auto-cleanup after expiration
  setTimeout(() => {
    tokenBlacklist.delete(token);
  }, 24 * 60 * 60 * 1000); // 24 hours
}

/**
 * Check if token is blacklisted
 */
export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token);
}

/**
 * Clear blacklist (mainly for testing)
 */
export function clearBlacklist(): void {
  tokenBlacklist.clear();
}

