/**
 * GET /api/v1/posts/:id
 * Get a single post by ID
 * 
 * PUT /api/v1/posts/:id
 * Update a post
 * 
 * PATCH /api/v1/posts/:id
 * Partially update a post
 * 
 * DELETE /api/v1/posts/:id
 * Delete a post
 */

import { NextRequest } from 'next/server';
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response';
import { authenticate } from '@/lib/api/auth-middleware';
import { getCorsHeaders } from '@/lib/api/middleware';
import db from '@/lib/db';

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
    const postId = Number.parseInt(params.id);

    if (Number.isNaN(postId)) {
      return ApiErrors.BAD_REQUEST('Invalid post ID');
    }

    const { searchParams } = new URL(req.url);
    const include = searchParams.get('include')?.split(',').map(i => i.trim()) || [];

    // Get post
    const [postRows] = await db.query(
      `SELECT 
        p.*,
        u.username as author_username,
        u.first_name as author_first_name,
        u.last_name as author_last_name,
        u.email as author_email
       FROM site_${siteId}_posts p
       LEFT JOIN users u ON p.author_id = u.id
       WHERE p.id = ?`,
      [postId]
    );

    const post = (postRows as any[])[0];
    if (!post) {
      return ApiErrors.NOT_FOUND('Post', postId);
    }

    // Format post
    const formatted: any = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      status: post.status,
      post_type: post.post_type,
      author_id: post.author_id,
      featured_image_id: post.featured_image_id,
      published_at: post.published_at,
      created_at: post.created_at,
      updated_at: post.updated_at,
    };

    // Load meta fields
    const [metaRows] = await db.query(
      `SELECT meta_key, meta_value FROM site_${siteId}_post_meta WHERE post_id = ?`,
      [postId]
    );
    
    const meta: Record<string, any> = {};
    for (const row of metaRows as any[]) {
      // Try to parse as JSON if it's the custom_fields meta
      if (row.meta_key === 'custom_fields') {
        try {
          meta[row.meta_key] = JSON.parse(row.meta_value);
        } catch {
          meta[row.meta_key] = row.meta_value;
        }
      } else {
        meta[row.meta_key] = row.meta_value;
      }
    }
    
    // Add meta fields to response
    if (meta.seo_title) formatted.seo_title = meta.seo_title;
    if (meta.seo_description) formatted.seo_description = meta.seo_description;
    if (meta.seo_keywords) formatted.seo_keywords = meta.seo_keywords;
    if (meta.custom_fields) formatted.custom_fields = meta.custom_fields;
    
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
        [postId]
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
        [postId]
      );
      formatted.tags = tagRows as any[];
    }

    // Include featured image
    if (include.includes('featured_image') && post.featured_image_id) {
      const [imageRows] = await db.query(
        `SELECT id, filename, url, alt, width, height, sizes
         FROM site_${siteId}_media
         WHERE id = ?`,
        [post.featured_image_id]
      );
      formatted.featured_image = (imageRows as any[])[0] || null;
    }

    // Include revisions
    if (include.includes('revisions')) {
      const [revisionRows] = await db.query(
        `SELECT id, title, content, author_id, created_at
         FROM site_${siteId}_post_revisions
         WHERE post_id = ?
         ORDER BY created_at DESC
         LIMIT 10`,
        [postId]
      );
      formatted.revisions = revisionRows as any[];
    }

    const response = apiSuccess(formatted);

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

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return await updatePost(req, params, false);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return await updatePost(req, params, true);
}

async function updatePost(
  req: NextRequest,
  params: { id: string },
  isPartial: boolean
) {
  try {
    // Authentication required
    const auth = await authenticate(req);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    const siteId = auth.user.siteId;
    const postId = Number.parseInt(params.id);

    if (Number.isNaN(postId)) {
      return ApiErrors.BAD_REQUEST('Invalid post ID');
    }

    // Check if post exists
    const [existingRows] = await db.query(
      `SELECT * FROM site_${siteId}_posts WHERE id = ?`,
      [postId]
    );

    const existingPost = (existingRows as any[])[0];
    if (!existingPost) {
      return ApiErrors.NOT_FOUND('Post', postId);
    }

    const body = await req.json();

    // Build update query dynamically
    const updates: string[] = [];
    const sqlParams: any[] = [];

    if (body.title !== undefined) {
      updates.push('title = ?');
      sqlParams.push(body.title);

      // Update slug if title changed
      if (body.title !== existingPost.title) {
        const newSlug = body.title
          .toLowerCase()
          .replaceAll(/[^a-z0-9]+/g, '-')
          .replaceAll(/(^-)|(-$)/g, '');
        updates.push('slug = ?');
        sqlParams.push(newSlug);
      }
    }

    if (body.content !== undefined) {
      updates.push('content = ?');
      sqlParams.push(body.content);
    }

    if (body.excerpt !== undefined) {
      updates.push('excerpt = ?');
      sqlParams.push(body.excerpt);
    }

    if (body.status !== undefined) {
      updates.push('status = ?');
      sqlParams.push(body.status);
    }

    if (body.featured_image_id !== undefined) {
      updates.push('featured_image_id = ?');
      sqlParams.push(body.featured_image_id);
    }

    if (body.published_at !== undefined) {
      updates.push('published_at = ?');
      sqlParams.push(body.published_at);
    }
    
    // Handle meta fields separately
    const metaFields: Record<string, any> = {};
    if (body.seo_title !== undefined) metaFields.seo_title = body.seo_title;
    if (body.seo_description !== undefined) metaFields.seo_description = body.seo_description;
    if (body.seo_keywords !== undefined) metaFields.seo_keywords = body.seo_keywords;
    if (body.custom_fields !== undefined) metaFields.custom_fields = JSON.stringify(body.custom_fields);

    if (updates.length === 0) {
      return ApiErrors.BAD_REQUEST('No fields to update');
    }

    // Always update updated_at
    updates.push('updated_at = NOW()');

    // Add post ID to sqlParams
    sqlParams.push(postId);

    // Update post
    await db.query(
      `UPDATE site_${siteId}_posts 
       SET ${updates.join(', ')}
       WHERE id = ?`,
      sqlParams
    );

    // Handle category updates if provided
    if (body.category_ids !== undefined) {
      // Remove existing categories
      await db.query(
        `DELETE FROM site_${siteId}_term_relationships 
         WHERE post_id = ? AND term_id IN (
           SELECT t.id FROM site_${siteId}_terms t
           JOIN site_${siteId}_taxonomies tax ON t.taxonomy_id = tax.id
           WHERE tax.name = 'category'
         )`,
        [postId]
      );

      // Add new categories
      if (Array.isArray(body.category_ids)) {
        for (const categoryId of body.category_ids) {
          await db.query(
            `INSERT INTO site_${siteId}_term_relationships (post_id, term_id) VALUES (?, ?)`,
            [postId, categoryId]
          );
        }
      }
    }

    // Handle tag updates if provided
    if (body.tag_ids !== undefined) {
      // Remove existing tags
      await db.query(
        `DELETE FROM site_${siteId}_term_relationships 
         WHERE post_id = ? AND term_id IN (
           SELECT t.id FROM site_${siteId}_terms t
           JOIN site_${siteId}_taxonomies tax ON t.taxonomy_id = tax.id
           WHERE tax.name = 'post_tag'
         )`,
        [postId]
      );

      // Add new tags
      if (Array.isArray(body.tag_ids)) {
        for (const tagId of body.tag_ids) {
          await db.query(
            `INSERT INTO site_${siteId}_term_relationships (post_id, term_id) VALUES (?, ?)`,
            [postId, tagId]
          );
        }
      }
    }
    
    // Save meta fields
    for (const [key, value] of Object.entries(metaFields)) {
      await db.query(
        `INSERT INTO site_${siteId}_post_meta (post_id, meta_key, meta_value)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)`,
        [postId, key, value]
      );
    }

    // Get updated post
    const [updatedRows] = await db.query(
      `SELECT * FROM site_${siteId}_posts WHERE id = ?`,
      [postId]
    );

    const updatedPost = (updatedRows as any[])[0];

    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'post.updated', 'post', ?, ?, ?)`,
      [auth.user.id, siteId, postId, updatedPost.title, `Updated post: ${updatedPost.title}`]
    );

    const response = apiSuccess(updatedPost);

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

    const siteId = auth.user.siteId;
    const postId = Number.parseInt(params.id);

    if (Number.isNaN(postId)) {
      return ApiErrors.BAD_REQUEST('Invalid post ID');
    }

    // Check if post exists
    const [postRows] = await db.query(
      `SELECT * FROM site_${siteId}_posts WHERE id = ?`,
      [postId]
    );

    const post = (postRows as any[])[0];
    if (!post) {
      return ApiErrors.NOT_FOUND('Post', postId);
    }

    // Delete post (this will cascade to related tables)
    await db.query(
      `DELETE FROM site_${siteId}_posts WHERE id = ?`,
      [postId]
    );

    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, site_id, action, entity_type, entity_id, entity_name, details)
       VALUES (?, ?, 'post.deleted', 'post', ?, ?, ?)`,
      [auth.user.id, siteId, postId, post.title, `Deleted post: ${post.title}`]
    );

    const response = apiSuccess({
      message: 'Post deleted successfully',
      id: postId,
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

