/**
 * API Middleware Utilities
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export interface ApiContext {
  user: any;
  siteId: number;
  isAuthenticated: boolean;
}

/**
 * Get API context from request
 */
export async function getApiContext(req: NextRequest): Promise<ApiContext | null> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return null;
    }

    return {
      user: session.user,
      siteId: session.user.currentSiteId || 1,
      isAuthenticated: true,
    };
  } catch (error) {
    console.error('Error getting API context:', error);
    return null;
  }
}

/**
 * Extract API key from request headers
 */
export function getApiKey(req: NextRequest): string | null {
  return req.headers.get('x-api-key');
}

/**
 * Extract Bearer token from request headers
 */
export function getBearerToken(req: NextRequest): string | null {
  const authorization = req.headers.get('authorization');
  
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.substring(7);
}

/**
 * Get site ID from request
 * Checks multiple sources: header, query param, subdomain
 */
export function getSiteId(req: NextRequest): number {
  // Check X-Site-ID header
  const siteIdHeader = req.headers.get('x-site-id');
  if (siteIdHeader) {
    const siteId = Number.parseInt(siteIdHeader);
    if (!Number.isNaN(siteId)) return siteId;
  }

  // Check query parameter
  const url = new URL(req.url);
  const siteIdParam = url.searchParams.get('site_id');
  if (siteIdParam) {
    const siteId = Number.parseInt(siteIdParam);
    if (!Number.isNaN(siteId)) return siteId;
  }

  // Check subdomain (if using subdomain-based multi-site)
  const host = req.headers.get('host');
  if (host) {
    // Implementation depends on your multi-site setup
    // For now, default to site 1
  }

  // Default to site 1
  return 1;
}

/**
 * CORS headers for API responses
 */
export function getCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Site-ID',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Rate limiting check (simple in-memory implementation)
 * In production, use Redis or similar
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  // No record or window expired
  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    rateLimitMap.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  }

  // Increment count
  record.count++;

  // Check if limit exceeded
  if (record.count > limit) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  return {
    allowed: true,
    remaining: limit - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Clean up expired rate limit records
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean up every minute

