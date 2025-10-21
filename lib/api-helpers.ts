/**
 * API Helper Functions
 * Common utilities for API routes in the multi-database architecture
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';

/**
 * Get the current site ID from the user's session
 * Falls back to site 1 if no session or site ID found
 */
export async function getCurrentSiteId(): Promise<number> {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.currentSiteId || 1;
}

/**
 * Get the current user's MongoDB ObjectId from session
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?._id || null;
}

/**
 * Check if the current user is a super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.is_super_admin === true;
}

/**
 * Get session or throw 401 error
 * Useful for protecting API routes
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    throw new Error('Unauthorized');
  }
  
  return session;
}

/**
 * Extract site ID from request or session
 * Useful for super admin routes that can specify a site
 */
export async function getSiteIdFromRequestOrSession(
  searchParams: URLSearchParams
): Promise<number> {
  // Check if site ID is in query params (for super admin)
  const querySiteId = searchParams.get('siteId');
  if (querySiteId) {
    const siteId = parseInt(querySiteId, 10);
    if (!isNaN(siteId)) {
      // Verify user is super admin if different from current site
      const currentSiteId = await getCurrentSiteId();
      if (siteId !== currentSiteId) {
        const isAdmin = await isSuperAdmin();
        if (!isAdmin) {
          throw new Error('Forbidden: Only super admins can access other sites');
        }
      }
      return siteId;
    }
  }
  
  // Fall back to session site ID
  return getCurrentSiteId();
}

