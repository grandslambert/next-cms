import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response';
import { authenticate } from '@/lib/api/auth-middleware';
import { getCorsHeaders } from '@/lib/api/middleware';

/**
 * GET /api/v1/media/:id
 * Get a single media file
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

    const siteId = auth.user.siteId;
    const mediaId = Number.parseInt(params.id);

    if (Number.isNaN(mediaId)) {
      return ApiErrors.BAD_REQUEST('Invalid media ID');
    }

    const { searchParams } = new URL(req.url);
    const include = searchParams.get('include')?.split(',').map(i => i.trim()) || [];

    // Get media file
    const [mediaRows] = await db.query(
      `SELECT m.*, u.username as uploader_username, u.first_name as uploader_first_name, u.last_name as uploader_last_name
       FROM site_${siteId}_media m
       LEFT JOIN users u ON m.uploaded_by = u.id
       WHERE m.id = ?`,
      [mediaId]
    );

    const media = (mediaRows as any[])[0];
    if (!media) {
      return ApiErrors.NOT_FOUND('Media', mediaId);
    }

    // Parse sizes JSON
    if (media.sizes) {
      try {
        media.sizes = typeof media.sizes === 'string' ? JSON.parse(media.sizes) : media.sizes;
      } catch {
        media.sizes = null;
      }
    }

    // Add uploader info (always included for single item)
    const displayName = `${media.uploader_first_name || ''} ${media.uploader_last_name || ''}`.trim() || media.uploader_username;
    media.uploader = {
      id: media.uploaded_by,
      username: media.uploader_username,
      display_name: displayName,
    };

    // Remove internal uploader fields
    delete media.uploader_username;
    delete media.uploader_first_name;
    delete media.uploader_last_name;

    // Add folder info if requested
    if (include.includes('folder') && media.folder_id) {
      const [folderRows] = await db.query(
        `SELECT id, name, parent_id FROM site_${siteId}_media_folders WHERE id = ?`,
        [media.folder_id]
      );
      media.folder = (folderRows as any[])[0] || null;
    }

    // Add usage info if requested
    if (include.includes('usage')) {
      // Count posts using this as featured image
      const [postCountRows] = await db.query(
        `SELECT COUNT(*) as count FROM site_${siteId}_posts WHERE featured_image_id = ?`,
        [mediaId]
      );
      const postCount = (postCountRows as any[])[0].count;

      // Count terms using this as image
      const [termCountRows] = await db.query(
        `SELECT COUNT(*) as count FROM site_${siteId}_terms WHERE image_id = ?`,
        [mediaId]
      );
      const termCount = (termCountRows as any[])[0].count;

      // Get actual posts using this media
      const [postsRows] = await db.query(
        `SELECT id, title, slug, status FROM site_${siteId}_posts WHERE featured_image_id = ? LIMIT 10`,
        [mediaId]
      );

      // Get actual terms using this media
      const [termsRows] = await db.query(
        `SELECT id, name, slug FROM site_${siteId}_terms WHERE image_id = ? LIMIT 10`,
        [mediaId]
      );

      media.usage = {
        posts: {
          count: postCount,
          items: postsRows as any[],
        },
        terms: {
          count: termCount,
          items: termsRows as any[],
        },
        total: postCount + termCount,
      };
    }

    const response = apiSuccess(media);

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
 * PATCH /api/v1/media/:id
 * Update media metadata
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

    // Check permission
    if (!auth.user.permissions.manage_media) {
      return ApiErrors.FORBIDDEN('You do not have permission to update media');
    }

    const siteId = auth.user.siteId;
    const mediaId = Number.parseInt(params.id);

    if (Number.isNaN(mediaId)) {
      return ApiErrors.BAD_REQUEST('Invalid media ID');
    }

    // Check if media exists
    const [existingRows] = await db.query(
      `SELECT * FROM site_${siteId}_media WHERE id = ?`,
      [mediaId]
    );

    if ((existingRows as any[]).length === 0) {
      return ApiErrors.NOT_FOUND('Media', mediaId);
    }

    const body = await req.json();
    const updates: string[] = [];
    const sqlParams: any[] = [];

    // Build dynamic update query (only metadata fields)
    if (body.title !== undefined) {
      updates.push('title = ?');
      sqlParams.push(body.title);
    }

    if (body.alt_text !== undefined) {
      updates.push('alt_text = ?');
      sqlParams.push(body.alt_text);
    }

    if (body.folder_id !== undefined) {
      updates.push('folder_id = ?');
      sqlParams.push(body.folder_id);
    }

    if (updates.length === 0) {
      return ApiErrors.BAD_REQUEST('No fields to update');
    }

    // Add media ID to params
    sqlParams.push(mediaId);

    // Update media
    await db.query(
      `UPDATE site_${siteId}_media 
       SET ${updates.join(', ')}
       WHERE id = ?`,
      sqlParams
    );

    // Get updated media
    const [updatedRows] = await db.query(
      `SELECT * FROM site_${siteId}_media WHERE id = ?`,
      [mediaId]
    );

    const media = (updatedRows as any[])[0];

    // Parse sizes JSON
    if (media.sizes) {
      try {
        media.sizes = typeof media.sizes === 'string' ? JSON.parse(media.sizes) : media.sizes;
      } catch {
        media.sizes = null;
      }
    }

    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'media.updated', 'media', ?, ?, ?)`,
      [auth.user.id, siteId, mediaId, media.original_name, `Updated media: ${media.original_name}`]
    );

    const response = apiSuccess(media);

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
 * DELETE /api/v1/media/:id
 * Delete media (move to trash or permanent delete)
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
    if (!auth.user.permissions.manage_media) {
      return ApiErrors.FORBIDDEN('You do not have permission to delete media');
    }

    const siteId = auth.user.siteId;
    const mediaId = Number.parseInt(params.id);

    if (Number.isNaN(mediaId)) {
      return ApiErrors.BAD_REQUEST('Invalid media ID');
    }

    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get('permanent') === 'true';
    const force = searchParams.get('force') === 'true';

    // Check if media exists
    const [mediaRows] = await db.query(
      `SELECT * FROM site_${siteId}_media WHERE id = ?`,
      [mediaId]
    );

    const media = (mediaRows as any[])[0];
    if (!media) {
      return ApiErrors.NOT_FOUND('Media', mediaId);
    }

    // Check if media is in use
    if (!force) {
      const [postCountRows] = await db.query(
        `SELECT COUNT(*) as count FROM site_${siteId}_posts WHERE featured_image_id = ?`,
        [mediaId]
      );
      const postCount = (postCountRows as any[])[0].count;

      const [termCountRows] = await db.query(
        `SELECT COUNT(*) as count FROM site_${siteId}_terms WHERE image_id = ?`,
        [mediaId]
      );
      const termCount = (termCountRows as any[])[0].count;

      if (postCount > 0 || termCount > 0) {
        return ApiErrors.BAD_REQUEST(
          `Media is in use by ${postCount} post(s) and ${termCount} term(s). Use ?force=true to delete anyway.`
        );
      }
    }

    if (permanent || media.deleted_at) {
      // Permanent delete (or already in trash)
      await db.query(
        `DELETE FROM site_${siteId}_media WHERE id = ?`,
        [mediaId]
      );

      // Log activity
      await db.query(
        `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
         VALUES (?, ?, 'media.deleted', 'media', ?, ?, ?)`,
        [auth.user.id, siteId, mediaId, media.original_name, `Permanently deleted media: ${media.original_name}`]
      );

      const response = apiSuccess({
        message: 'Media permanently deleted',
        id: mediaId,
      });

      // Add CORS headers
      const headers = getCorsHeaders();
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }

      return response;
    } else {
      // Soft delete (move to trash)
      await db.query(
        `UPDATE site_${siteId}_media SET deleted_at = NOW() WHERE id = ?`,
        [mediaId]
      );

      // Log activity
      await db.query(
        `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
         VALUES (?, ?, 'media.trashed', 'media', ?, ?, ?)`,
        [auth.user.id, siteId, mediaId, media.original_name, `Moved media to trash: ${media.original_name}`]
      );

      const response = apiSuccess({
        message: 'Media moved to trash',
        id: mediaId,
      });

      // Add CORS headers
      const headers = getCorsHeaders();
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }

      return response;
    }
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

