import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { apiSuccess, apiSuccessPaginated, ApiErrors, handleApiError } from '@/lib/api/response';
import { authenticate } from '@/lib/api/auth-middleware';
import { validatePagination } from '@/lib/api/validation';
import { getCorsHeaders } from '@/lib/api/middleware';

/**
 * GET /api/v1/media
 * List all media files
 */
export async function GET(req: NextRequest) {
  try {
    // Authentication required
    const auth = await authenticate(req);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    const siteId = auth.user.siteId;
    const { searchParams } = new URL(req.url);

    // Pagination
    const pagination = validatePagination(searchParams);
    const { page, per_page } = pagination;
    const offset = (page - 1) * per_page;

    // Filters
    const mime_type = searchParams.get('mime_type'); // Filter by mime type (image/jpeg, video/mp4, etc.)
    const mime_category = searchParams.get('mime_category'); // Filter by category (image, video, audio, document)
    const folder_id = searchParams.get('folder_id');
    const search = searchParams.get('search');
    const include_trash = searchParams.get('include_trash') === 'true';
    const only_trash = searchParams.get('only_trash') === 'true';
    const include = searchParams.get('include')?.split(',').map(i => i.trim()) || [];

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];

    if (mime_type) {
      conditions.push('m.mime_type = ?');
      params.push(mime_type);
    }

    if (mime_category) {
      conditions.push('m.mime_type LIKE ?');
      params.push(`${mime_category}/%`);
    }

    if (folder_id !== null && folder_id !== undefined) {
      if (folder_id === '0' || folder_id === 'null') {
        conditions.push('m.folder_id IS NULL');
      } else {
        conditions.push('m.folder_id = ?');
        params.push(Number.parseInt(folder_id));
      }
    }

    if (search) {
      conditions.push('(m.original_name LIKE ? OR m.title LIKE ? OR m.alt_text LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Handle trash
    if (only_trash) {
      conditions.push('m.deleted_at IS NOT NULL');
    } else if (!include_trash) {
      conditions.push('m.deleted_at IS NULL');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const [countRows] = await db.query(
      `SELECT COUNT(*) as total 
       FROM site_${siteId}_media m
       ${whereClause}`,
      params
    );
    const total = (countRows as any[])[0].total;
    const totalPages = Math.ceil(total / per_page);

    // Get media files
    const [mediaRows] = await db.query(
      `SELECT m.*, u.username as uploader_username, u.first_name as uploader_first_name, u.last_name as uploader_last_name
       FROM site_${siteId}_media m
       LEFT JOIN users u ON m.uploaded_by = u.id
       ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, per_page, offset]
    );

    const media = mediaRows as any[];

    // Format results
    for (const item of media) {
      // Parse sizes JSON
      if (item.sizes) {
        try {
          item.sizes = typeof item.sizes === 'string' ? JSON.parse(item.sizes) : item.sizes;
        } catch {
          item.sizes = null;
        }
      }

      // Add uploader info if requested
      if (include.includes('uploader')) {
        const displayName = `${item.uploader_first_name || ''} ${item.uploader_last_name || ''}`.trim() || item.uploader_username;
        item.uploader = {
          id: item.uploaded_by,
          username: item.uploader_username,
          display_name: displayName,
        };
      }

      // Remove internal uploader fields
      delete item.uploader_username;
      delete item.uploader_first_name;
      delete item.uploader_last_name;

      // Add folder info if requested
      if (include.includes('folder') && item.folder_id) {
        const [folderRows] = await db.query(
          `SELECT id, name, parent_id FROM site_${siteId}_media_folders WHERE id = ?`,
          [item.folder_id]
        );
        item.folder = (folderRows as any[])[0] || null;
      }

      // Add usage count if requested
      if (include.includes('usage')) {
        // Count posts using this as featured image
        const [postCountRows] = await db.query(
          `SELECT COUNT(*) as count FROM site_${siteId}_posts WHERE featured_image_id = ?`,
          [item.id]
        );
        const postCount = (postCountRows as any[])[0].count;

        // Count terms using this as image
        const [termCountRows] = await db.query(
          `SELECT COUNT(*) as count FROM site_${siteId}_terms WHERE image_id = ?`,
          [item.id]
        );
        const termCount = (termCountRows as any[])[0].count;

        item.usage = {
          posts: postCount,
          terms: termCount,
          total: postCount + termCount,
        };
      }
    }

    const response = apiSuccessPaginated(
      media,
      {
        total,
        count: media.length,
        per_page,
        current_page: page,
        total_pages: totalPages,
      },
      `/api/v1/media`
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

