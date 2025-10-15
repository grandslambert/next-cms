import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { slugify } from '@/lib/utils';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as author_name,
              m.url as featured_image_url, m.sizes as featured_image_sizes
       FROM posts p 
       LEFT JOIN users u ON p.author_id = u.id
       LEFT JOIN media m ON p.featured_image_id = m.id
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

    // Check if post exists and get author
    const [existingPost] = await db.query<RowDataPacket[]>(
      'SELECT author_id, post_type FROM posts WHERE id = ?',
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
    const { title, slug: customSlug, content, excerpt, featured_image_id, status, parent_id, menu_order, author_id } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Check if user can publish
    if (status === 'published' && !permissions.can_publish) {
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
    const publishedAt = status === 'published' ? new Date() : null;

    // Build dynamic update query
    const updateFields = ['title = ?', 'slug = ?', 'content = ?', 'excerpt = ?', 'featured_image_id = ?', 'parent_id = ?', 'menu_order = ?', 'status = ?', 'published_at = ?'];
    const updateValues: any[] = [title, slug, content || '', excerpt || '', featured_image_id || null, parent_id || null, menu_order || 0, status || 'draft', publishedAt];

    // Add author_id to update if provided and user has permission
    if (author_id && permissions.can_reassign) {
      updateFields.push('author_id = ?');
      updateValues.push(author_id);
    }

    updateValues.push(params.id); // Add the post ID for WHERE clause

    await db.query<ResultSetHeader>(
      `UPDATE posts SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const [updatedPost] = await db.query<RowDataPacket[]>(
      'SELECT * FROM posts WHERE id = ?',
      [params.id]
    );

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

    // Check if post exists and get author
    const [existingPost] = await db.query<RowDataPacket[]>(
      'SELECT author_id, post_type FROM posts WHERE id = ?',
      [params.id]
    );

    if (existingPost.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = existingPost[0];
    const isOwner = post.author_id === parseInt(userId);
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
      'UPDATE posts SET status = ? WHERE id = ?',
      ['trash', params.id]
    );

    return NextResponse.json({ success: true, message: 'Post moved to trash' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}

