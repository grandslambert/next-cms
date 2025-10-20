/**
 * GET /api/v1/posts
 * List posts with filtering, pagination, sorting, and field selection
 * 
 * POST /api/v1/posts
 * Create a new post
 */

import { NextRequest } from 'next/server';
import { apiSuccess, apiSuccessPaginated, ApiErrors, handleApiError } from '@/lib/api/response';
import { validatePagination, validateSort, validateEnum, validateRequired } from '@/lib/api/validation';
import { authenticate } from '@/lib/api/auth-middleware';
import { getCorsHeaders } from '@/lib/api/middleware';
import db from '@/lib/db';

const ALLOWED_SORT_FIELDS = ['id', 'title', 'created_at', 'updated_at', 'published_at', 'author_id'];
const ALLOWED_STATUSES = ['draft', 'pending', 'published', 'scheduled', 'private'];

export async function GET(req: NextRequest) {
  try {
    // Authentication required
    const auth = await authenticate(req);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    const siteId = auth.user.siteId;
    const { searchParams } = new URL(req.url);

    // Validate pagination
    const { page, per_page, offset, errors: paginationErrors } = validatePagination(searchParams);
    if (paginationErrors.length > 0) {
      return ApiErrors.VALIDATION_ERROR(paginationErrors[0].message, paginationErrors[0].field);
    }

    // Validate sorting
    const sortParam = searchParams.get('sort');
    const sortValidation = validateSort(sortParam, ALLOWED_SORT_FIELDS);
    if (sortValidation?.error) {
      return ApiErrors.VALIDATION_ERROR(sortValidation.error.message, sortValidation.error.field);
    }

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];

    // Filter by status
    const status = searchParams.get('status');
    if (status) {
      const statusError = validateEnum(status, 'status', ALLOWED_STATUSES);
      if (statusError) {
        return ApiErrors.VALIDATION_ERROR(statusError.message, statusError.field);
      }
      conditions.push('p.status = ?');
      params.push(status);
    }

    // Filter by post type (default to 'post')
    const postType = searchParams.get('post_type') || 'post';
    conditions.push('p.post_type = ?');
    params.push(postType);

    // Filter by author
    const authorId = searchParams.get('author_id');
    if (authorId) {
      conditions.push('p.author_id = ?');
      params.push(Number.parseInt(authorId));
    }

    // Filter by date range
    const dateFrom = searchParams.get('date_from');
    if (dateFrom) {
      conditions.push('p.created_at >= ?');
      params.push(dateFrom);
    }

    const dateTo = searchParams.get('date_to');
    if (dateTo) {
      conditions.push('p.created_at <= ?');
      params.push(dateTo);
    }

    // Search
    const search = searchParams.get('search');
    if (search) {
      conditions.push('(p.title LIKE ? OR p.content LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    // Get total count
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [countRows] = await db.query(
      `SELECT COUNT(*) as total FROM site_${siteId}_posts p ${whereClause}`,
      params
    );

    const countResult = (countRows as any[])[0];
    const total = countResult.total;
    const totalPages = Math.ceil(total / per_page);

    // Build ORDER BY
    let orderBy = 'p.created_at DESC';
    if (sortValidation && !sortValidation.error) {
      orderBy = `p.${sortValidation.field} ${sortValidation.order}`;
    }

    // Get posts
    const [postRows] = await db.query(
      `SELECT 
        p.id,
        p.title,
        p.slug,
        p.content,
        p.excerpt,
        p.status,
        p.post_type,
        p.author_id,
        p.featured_image_id,
        p.published_at,
        p.created_at,
        p.updated_at,
        u.username as author_username,
        u.first_name as author_first_name,
        u.last_name as author_last_name,
        u.email as author_email
       FROM site_${siteId}_posts p
       LEFT JOIN users u ON p.author_id = u.id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, per_page, offset]
    );
    const posts = postRows as any[];

    // Check if we should include related resources
    const include = searchParams.get('include')?.split(',').map(i => i.trim()) || [];

    // Load all meta fields for posts in bulk
    const postIds = posts.map((p: any) => p.id);
    const postMeta: Record<number, Record<string, any>> = {};
    
    if (postIds.length > 0) {
      const [metaRows] = await db.query(
        `SELECT post_id, meta_key, meta_value FROM site_${siteId}_post_meta WHERE post_id IN (?)`,
        [postIds]
      );
      
      for (const row of metaRows as any[]) {
        if (!postMeta[row.post_id]) {
          postMeta[row.post_id] = {};
        }
        
        // Try to parse as JSON if it's the custom_fields meta
        if (row.meta_key === 'custom_fields') {
          try {
            postMeta[row.post_id][row.meta_key] = JSON.parse(row.meta_value);
          } catch {
            postMeta[row.post_id][row.meta_key] = row.meta_value;
          }
        } else {
          postMeta[row.post_id][row.meta_key] = row.meta_value;
        }
      }
    }

    // Format posts with optional includes
    const formattedPosts = await Promise.all(
      posts.map(async (post: any) => {
        const formatted: any = {
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          status: post.status,
          post_type: post.post_type,
          author_id: post.author_id,
          featured_image_id: post.featured_image_id,
          published_at: post.published_at,
          created_at: post.created_at,
          updated_at: post.updated_at,
        };
        
        // Add meta fields if they exist
        const meta = postMeta[post.id] || {};
        if (meta.seo_title) formatted.seo_title = meta.seo_title;
        if (meta.seo_description) formatted.seo_description = meta.seo_description;
        if (meta.seo_keywords) formatted.seo_keywords = meta.seo_keywords;
        if (meta.custom_fields) formatted.custom_fields = meta.custom_fields;

        // Include full content if requested
        if (include.includes('content')) {
          formatted.content = post.content;
        }

        // Include author details
        if (include.includes('author')) {
          const displayName = `${post.author_first_name || ''} ${post.author_last_name || ''}`.trim() || post.author_username;
          formatted.author = {
            id: post.author_id,
            username: post.author_username,
            first_name: post.author_first_name,
            last_name: post.author_last_name,
            display_name: displayName,
            email: post.author_email,
          };
        }

        // Include categories
        if (include.includes('categories')) {
          const [categoryRows] = await db.query(
            `SELECT t.id, t.name, t.slug
             FROM site_${siteId}_terms t
             JOIN site_${siteId}_term_relationships tr ON t.id = tr.term_id
             JOIN site_${siteId}_taxonomies tax ON t.taxonomy_id = tax.id
             WHERE tr.post_id = ? AND tax.name = 'category'`,
            [post.id]
          );
          formatted.categories = categoryRows as any[];
        }

        // Include tags
        if (include.includes('tags')) {
          const [tagRows] = await db.query(
            `SELECT t.id, t.name, t.slug
             FROM site_${siteId}_terms t
             JOIN site_${siteId}_term_relationships tr ON t.id = tr.term_id
             JOIN site_${siteId}_taxonomies tax ON t.taxonomy_id = tax.id
             WHERE tr.post_id = ? AND tax.name = 'post_tag'`,
            [post.id]
          );
          formatted.tags = tagRows as any[];
        }

        // Include featured image
        if (include.includes('featured_image') && post.featured_image_id) {
          const [imageRows] = await db.query(
            `SELECT id, filename, url, alt, width, height
             FROM site_${siteId}_media
             WHERE id = ?`,
            [post.featured_image_id]
          );
          formatted.featured_image = (imageRows as any[])[0] || null;
        }

        return formatted;
      })
    );

    const response = apiSuccessPaginated(
      formattedPosts,
      {
        total,
        count: posts.length,
        per_page,
        current_page: page,
        total_pages: totalPages,
      },
      `/api/v1/posts`
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

export async function POST(req: NextRequest) {
  try {
    // Authentication required
    const auth = await authenticate(req);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    const siteId = auth.user.siteId;
    const body = await req.json();

    // Validate required fields
    const validation = validateRequired(body, ['title', 'content']);
    if (!validation.valid) {
      return ApiErrors.VALIDATION_ERROR(
        validation.errors[0].message,
        validation.errors[0].field
      );
    }

    const {
      title,
      content,
      excerpt = '',
      status = 'draft',
      post_type = 'post',
      featured_image_id = null,
      published_at = null,
    } = body;
    
    // Extract meta fields (stored separately)
    const metaFields: Record<string, any> = {};
    if (body.seo_title) metaFields.seo_title = body.seo_title;
    if (body.seo_description) metaFields.seo_description = body.seo_description;
    if (body.seo_keywords) metaFields.seo_keywords = body.seo_keywords;
    if (body.custom_fields) metaFields.custom_fields = JSON.stringify(body.custom_fields);

    // Validate status
    const statusError = validateEnum(status, 'status', ALLOWED_STATUSES);
    if (statusError) {
      return ApiErrors.VALIDATION_ERROR(statusError.message, statusError.field);
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/(^-)|(-$)/g, '');

    // Check if slug already exists
    const [existingRows] = await db.query(
      `SELECT id FROM site_${siteId}_posts WHERE slug = ? AND post_type = ?`,
      [slug, post_type]
    );

    const existing = (existingRows as any[])[0];
    if (existing) {
      return ApiErrors.CONFLICT(`Post with slug "${slug}" already exists`);
    }

    // Create post
    const [result] = await db.query(
      `INSERT INTO site_${siteId}_posts 
       (title, slug, content, excerpt, status, post_type, author_id, featured_image_id, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        slug,
        content,
        excerpt,
        status,
        post_type,
        auth.user.id,
        featured_image_id,
        published_at,
      ]
    );

    const postId = (result as any).insertId;
    
    // Save meta fields
    for (const [key, value] of Object.entries(metaFields)) {
      await db.query(
        `INSERT INTO site_${siteId}_post_meta (post_id, meta_key, meta_value)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)`,
        [postId, key, value]
      );
    }

    // Handle categories if provided
    if (body.category_ids && Array.isArray(body.category_ids)) {
      for (const categoryId of body.category_ids) {
        await db.query(
          `INSERT INTO site_${siteId}_term_relationships (post_id, term_id) VALUES (?, ?)`,
          [postId, categoryId]
        );
      }
    }

    // Handle tags if provided
    if (body.tag_ids && Array.isArray(body.tag_ids)) {
      for (const tagId of body.tag_ids) {
        await db.query(
          `INSERT INTO site_${siteId}_term_relationships (post_id, term_id) VALUES (?, ?)`,
          [postId, tagId]
        );
      }
    }

    // Get created post
    const [postRows] = await db.query(
      `SELECT * FROM site_${siteId}_posts WHERE id = ?`,
      [postId]
    );

    const createdPost = (postRows as any[])[0];

    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'post.created', 'post', ?, ?, ?)`,
      [auth.user.id, siteId, postId, title, `Created post: ${title}`]
    );

    const response = apiSuccess(createdPost, 201);

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

