import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getSiteTable } from '@/lib/db';
import { slugify } from '@/lib/utils';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const siteId = (session?.user as any)?.currentSiteId || 1;
    const postsTable = getSiteTable(siteId, 'posts');
    const mediaTable = getSiteTable(siteId, 'media');
    
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as author_name,
              m.url as featured_image_url, m.sizes as featured_image_sizes
       FROM ${postsTable} p 
       LEFT JOIN users u ON p.author_id = u.id
       LEFT JOIN ${mediaTable} m ON p.featured_image_id = m.id
       WHERE p.id = ?`,
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ post: rows[0] });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const permissions = (session.user as any).permissions || {};
    const siteId = (session.user as any).currentSiteId || 1;
    const postsTable = getSiteTable(siteId, 'posts');
    const postMetaTable = getSiteTable(siteId, 'post_meta');
    const postRevisionsTable = getSiteTable(siteId, 'post_revisions');
    const settingsTable = getSiteTable(siteId, 'settings');

    // Check if post exists and get author + current content for revision
    const [existingPost] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${postsTable} WHERE id = ?`,
      [params.id]
    );

    if (existingPost.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = existingPost[0];
    const isOwner = post.author_id === parseInt(userId);
    const canManageOthers = permissions.manage_others_posts === true;

    // Check if user can edit this post
    if (!isOwner && !canManageOthers) {
      return NextResponse.json({ error: 'You can only edit your own posts' }, { status: 403 });
    }

    const body = await request.json();
    const { title, slug: customSlug, content, excerpt, featured_image_id, status, parent_id, menu_order, author_id, scheduled_publish_at } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Check if user can publish (required for both immediate and scheduled publishing)
    if ((status === 'published' || status === 'scheduled') && !permissions.can_publish) {
      return NextResponse.json({ error: 'You do not have permission to publish posts' }, { status: 403 });
    }

    // Check if user can reassign author
    if (author_id && author_id !== post.author_id) {
      if (!permissions.can_reassign) {
        return NextResponse.json({ error: 'You do not have permission to reassign posts' }, { status: 403 });
      }
    }

    // Use custom slug if provided, otherwise generate from title
    const slug = customSlug || slugify(title);
    
    // Handle published_at and scheduled_publish_at based on status
    let publishedAt = null;
    let scheduledPublishAt = null;
    
    if (status === 'published') {
      publishedAt = new Date();
    } else if (status === 'scheduled') {
      scheduledPublishAt = scheduled_publish_at ? new Date(scheduled_publish_at) : null;
      if (!scheduledPublishAt || scheduledPublishAt <= new Date()) {
        return NextResponse.json({ error: 'Scheduled publish date must be in the future' }, { status: 400 });
      }
    }

    // Build dynamic update query
    const updateFields = ['title = ?', 'slug = ?', 'content = ?', 'excerpt = ?', 'featured_image_id = ?', 'parent_id = ?', 'menu_order = ?', 'status = ?', 'published_at = ?', 'scheduled_publish_at = ?'];
    const updateValues: any[] = [title, slug, content || '', excerpt || '', featured_image_id || null, parent_id || null, menu_order || 0, status || 'draft', publishedAt, scheduledPublishAt];

    // Add author_id to update if provided and user has permission
    if (author_id && permissions.can_reassign) {
      updateFields.push('author_id = ?');
      updateValues.push(author_id);
    }

    updateValues.push(params.id); // Add the post ID for WHERE clause

    // Get max_revisions setting
    const [settingsResult] = await db.query<RowDataPacket[]>(
      `SELECT setting_value FROM ${settingsTable} WHERE setting_key = ?`,
      ['max_revisions']
    );
    const maxRevisions = settingsResult.length > 0 ? Number.parseInt(settingsResult[0].setting_value) : 10;

    // Save revision before updating (only if revisions are enabled)
    if (maxRevisions > 0) {
      // Get current custom fields
      const [currentMeta] = await db.query<RowDataPacket[]>(
        `SELECT meta_key, meta_value FROM ${postMetaTable} WHERE post_id = ?`,
        [params.id]
      );
      
      const customFieldsObj: Record<string, string> = {};
      currentMeta.forEach((meta: any) => {
        customFieldsObj[meta.meta_key] = meta.meta_value;
      });

      await db.query<ResultSetHeader>(
        `INSERT INTO ${postRevisionsTable} (post_id, title, content, excerpt, custom_fields, author_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [params.id, post.title, post.content, post.excerpt, JSON.stringify(customFieldsObj), userId]
      );

      // Clean up old revisions - keep only the most recent maxRevisions
      await db.query<ResultSetHeader>(
        `DELETE FROM ${postRevisionsTable} 
         WHERE post_id = ? 
         AND id NOT IN (
           SELECT id FROM (
             SELECT id FROM ${postRevisionsTable} 
             WHERE post_id = ? 
             ORDER BY created_at DESC 
             LIMIT ?
           ) AS keep_revisions
         )`,
        [params.id, params.id, maxRevisions]
      );
    }

    await db.query<ResultSetHeader>(
      `UPDATE ${postsTable} SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const [updatedPost] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${postsTable} WHERE id = ?`,
      [params.id]
    );

    // Log activity
    const action = status === 'published' && post.status !== 'published' 
      ? 'post_published' 
      : status === 'scheduled' 
      ? 'post_scheduled' 
      : 'post_updated';
    
    await logActivity({
      userId,
      action,
      entityType: 'post',
      entityId: Number.parseInt(params.id),
      entityName: title || post.title,
      details: `Updated ${post.post_type}: "${title || post.title}"`,
      changesBefore: {
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        status: post.status,
        featured_image_id: post.featured_image_id,
        parent_id: post.parent_id,
        menu_order: post.menu_order,
      },
      changesAfter: {
        title: title || post.title,
        content: content !== undefined ? content : post.content,
        excerpt: excerpt !== undefined ? excerpt : post.excerpt,
        status: status || post.status,
        featured_image_id: featured_image_id !== undefined ? featured_image_id : post.featured_image_id,
        parent_id: parent_id !== undefined ? parent_id : post.parent_id,
        menu_order: menu_order !== undefined ? menu_order : post.menu_order,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ post: updatedPost[0] });
  } catch (error: any) {
    console.error('Error updating post:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const permissions = (session.user as any).permissions || {};
    const siteId = (session.user as any).currentSiteId || 1;
    const postsTable = getSiteTable(siteId, 'posts');

    // Check if post exists and get author
    const [existingPost] = await db.query<RowDataPacket[]>(
      `SELECT author_id, post_type, title FROM ${postsTable} WHERE id = ?`,
      [params.id]
    );

    if (existingPost.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = existingPost[0];
    const isOwner = post.author_id === Number.parseInt(userId);
    const canDelete = permissions.can_delete === true;
    const canDeleteOthers = permissions.can_delete_others === true;

    // Check if user can delete this post
    if (isOwner && !canDelete) {
      return NextResponse.json({ error: 'You do not have permission to delete posts' }, { status: 403 });
    }
    
    if (!isOwner && !canDeleteOthers) {
      return NextResponse.json({ error: 'You do not have permission to delete others\' posts' }, { status: 403 });
    }

    // Move post to trash instead of permanently deleting
    await db.query<ResultSetHeader>(
      `UPDATE ${postsTable} SET status = ? WHERE id = ?`,
      ['trash', params.id]
    );

    // Log activity
    await logActivity({
      userId,
      action: 'post_trashed',
      entityType: 'post',
      entityId: Number.parseInt(params.id),
      entityName: post.title,
      details: `Moved ${post.post_type} to trash: "${post.title}"`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ success: true, message: 'Post moved to trash' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}

