import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { slugify } from '@/lib/utils';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const postType = searchParams.get('post_type') || 'post';
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const userId = session ? (session.user as any).id : null;
    const permissions = session ? (session.user as any).permissions || {} : {};
    const canViewOthers = permissions.view_others_posts === true;

    let query = `
      SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as author_name,
             m.url as featured_image_url, m.sizes as featured_image_sizes
      FROM posts p 
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN media m ON p.featured_image_id = m.id
      WHERE p.post_type = ?
    `;
    const params: any[] = [postType];

    // Filter by author if user can't view others' posts
    if (userId && !canViewOthers) {
      query += ' AND p.author_id = ?';
      params.push(userId);
    }

    if (status && status !== 'all') {
      query += ' AND p.status = ?';
      params.push(status);
    } else if (!status || status === 'all') {
      // Exclude trash from default queries
      query += ' AND p.status != ?';
      params.push('trash');
    }

    // Add search filter
    if (search && search.trim() !== '') {
      query += ' AND (p.title LIKE ? OR p.content LIKE ?)';
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.query<RowDataPacket[]>(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM posts WHERE post_type = ?';
    const countParams: any[] = [postType];
    
    // Filter by author if user can't view others' posts
    if (userId && !canViewOthers) {
      countQuery += ' AND author_id = ?';
      countParams.push(userId);
    }
    
    if (status && status !== 'all') {
      countQuery += ' AND status = ?';
      countParams.push(status);
    } else if (!status || status === 'all') {
      // Exclude trash from default counts
      countQuery += ' AND status != ?';
      countParams.push('trash');
    }

    // Add search filter to count query
    if (search && search.trim() !== '') {
      countQuery += ' AND (title LIKE ? OR content LIKE ?)';
      const searchTerm = `%${search.trim()}%`;
      countParams.push(searchTerm, searchTerm);
    }

    const [countRows] = await db.query<RowDataPacket[]>(countQuery, countParams);
    const total = countRows[0].total;

    return NextResponse.json({ posts: rows, total });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, slug: customSlug, content, excerpt, featured_image_id, status, post_type, parent_id, menu_order, scheduled_publish_at } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const permissions = (session.user as any).permissions || {};

    // Check if user can publish (required for both immediate and scheduled publishing)
    if ((status === 'published' || status === 'scheduled') && !permissions.can_publish) {
      return NextResponse.json({ error: 'You do not have permission to publish posts' }, { status: 403 });
    }

    // Use custom slug if provided, otherwise generate from title
    const slug = customSlug || slugify(title);
    const userId = (session.user as any).id;
    
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

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO posts (post_type, title, slug, content, excerpt, featured_image_id, parent_id, menu_order, status, author_id, published_at, scheduled_publish_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [post_type || 'post', title, slug, content || '', excerpt || '', featured_image_id || null, parent_id || null, menu_order || 0, status || 'draft', userId, publishedAt, scheduledPublishAt]
    );

    const [newPost] = await db.query<RowDataPacket[]>(
      'SELECT * FROM posts WHERE id = ?',
      [result.insertId]
    );

    // Log activity
    await logActivity({
      userId,
      action: status === 'published' ? 'post_published' : 'post_created',
      entityType: 'post',
      entityId: result.insertId,
      entityName: title,
      details: `Created ${post_type || 'post'}: "${title}" with status: ${status || 'draft'}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ post: newPost[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating post:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

