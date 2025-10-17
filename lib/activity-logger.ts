import db, { getSiteTable } from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

export type ActivityAction = 
  // Auth actions
  | 'login' | 'logout' | 'login_failed'
  // Post actions
  | 'post_created' | 'post_updated' | 'post_deleted' | 'post_trashed' | 'post_restored' | 'post_published' | 'post_scheduled'
  // Media actions
  | 'media_uploaded' | 'media_updated' | 'media_deleted' | 'media_trashed' | 'media_restored'
  // User actions
  | 'user_created' | 'user_updated' | 'user_deleted'
  // Role actions
  | 'role_created' | 'role_updated' | 'role_deleted'
  // Post Type actions
  | 'post_type_created' | 'post_type_updated' | 'post_type_deleted'
  // Taxonomy actions
  | 'taxonomy_created' | 'taxonomy_updated' | 'taxonomy_deleted'
  | 'term_created' | 'term_updated' | 'term_deleted'
  // Settings actions
  | 'settings_updated'
  // Folder actions
  | 'folder_created' | 'folder_updated' | 'folder_deleted'
  // Menu actions
  | 'menu_created' | 'menu_updated' | 'menu_deleted'
  | 'menu_item_created' | 'menu_item_updated' | 'menu_item_deleted';

export type EntityType = 
  | 'auth' | 'post' | 'media' | 'user' | 'role' | 'post_type' | 'taxonomy' | 'term' | 'settings' | 'folder' | 'menu' | 'menu_item';

interface LogActivityParams {
  userId: number;
  action: ActivityAction;
  entityType: EntityType;
  entityId?: number | null;
  entityName?: string | null;
  details?: string | Record<string, any> | null;
  changesBefore?: Record<string, any> | null;
  changesAfter?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  siteId?: number; // Site context for multi-site support
}

export async function logActivity({
  userId,
  action,
  entityType,
  entityId = null,
  entityName = null,
  details = null,
  changesBefore = null,
  changesAfter = null,
  ipAddress = null,
  userAgent = null,
  siteId = 1, // Default to site 1 for backwards compatibility
}: LogActivityParams): Promise<void> {
  try {
    // Convert details to JSON string if it's an object
    const detailsStr = details 
      ? (typeof details === 'string' ? details : JSON.stringify(details))
      : null;

    // Convert changes to JSON strings
    const changesBeforeStr = changesBefore ? JSON.stringify(changesBefore) : null;
    const changesAfterStr = changesAfter ? JSON.stringify(changesAfter) : null;

    // Use site-specific activity log table
    const activityLogTable = getSiteTable(siteId, 'activity_log');

    await db.execute<ResultSetHeader>(
      `INSERT INTO ${activityLogTable} (user_id, action, entity_type, entity_id, entity_name, details, changes_before, changes_after, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, action, entityType, entityId, entityName, detailsStr, changesBeforeStr, changesAfterStr, ipAddress, userAgent]
    );
  } catch (error) {
    // Log error but don't throw - we don't want logging failures to break the app
    console.error('Failed to log activity:', error);
  }
}

// Helper to extract IP from request
export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIp || null;
}

// Helper to get user agent
export function getUserAgent(request: Request): string | null {
  return request.headers.get('user-agent');
}

