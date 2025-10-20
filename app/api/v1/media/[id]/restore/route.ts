import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response';
import { authenticate } from '@/lib/api/auth-middleware';
import { getCorsHeaders } from '@/lib/api/middleware';

/**
 * POST /api/v1/media/:id/restore
 * Restore media from trash
 */
export async function POST(
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
    if (!auth.user.permissions.manage_media) {
      return ApiErrors.FORBIDDEN('You do not have permission to restore media');
    }

    const siteId = auth.user.siteId;
    const mediaId = Number.parseInt(params.id);

    if (Number.isNaN(mediaId)) {
      return ApiErrors.BAD_REQUEST('Invalid media ID');
    }

    // Check if media exists and is in trash
    const [mediaRows] = await db.query(
      `SELECT * FROM site_${siteId}_media WHERE id = ?`,
      [mediaId]
    );

    const media = (mediaRows as any[])[0];
    if (!media) {
      return ApiErrors.NOT_FOUND('Media', mediaId);
    }

    if (!media.deleted_at) {
      return ApiErrors.BAD_REQUEST('Media is not in trash');
    }

    // Restore media
    await db.query(
      `UPDATE site_${siteId}_media SET deleted_at = NULL WHERE id = ?`,
      [mediaId]
    );

    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'media.restored', 'media', ?, ?, ?)`,
      [auth.user.id, siteId, mediaId, media.original_name, `Restored media from trash: ${media.original_name}`]
    );

    // Get restored media
    const [restoredRows] = await db.query(
      `SELECT * FROM site_${siteId}_media WHERE id = ?`,
      [mediaId]
    );

    const restoredMedia = (restoredRows as any[])[0];

    // Parse sizes JSON
    if (restoredMedia.sizes) {
      try {
        restoredMedia.sizes = typeof restoredMedia.sizes === 'string' 
          ? JSON.parse(restoredMedia.sizes) 
          : restoredMedia.sizes;
      } catch {
        restoredMedia.sizes = null;
      }
    }

    const response = apiSuccess(restoredMedia);

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

