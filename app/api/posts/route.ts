import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { slugify } from '@/lib/utils';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const postType = searchParams.get('post_type') || 'post';
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as author_name,
             m.url as featured_image_url, m.sizes as featured_image_sizes
      FROM posts p 
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN media m ON p.featured_image_id = m.id
      WHERE p.post_type = ?
    `;
    const params: any[] = [postType];

    if (status && status !== 'all') {
      query += ' AND p.status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.query<RowDataPacket[]>(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM posts WHERE post_type = ?';
    const countParams: any[] = [postType];
    
    if (status && status !== 'all') {
      countQuery += ' AND status = ?';
      countParams.push(status);
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
    const { title, content, excerpt, featured_image_id, status, post_type, parent_id, menu_order } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const slug = slugify(title);
    const userId = (session.user as any).id;
    const publishedAt = status === 'published' ? new Date() : null;

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO posts (post_type, title, slug, content, excerpt, featured_image_id, parent_id, menu_order, status, author_id, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [post_type || 'post', title, slug, content || '', excerpt || '', featured_image_id || null, parent_id || null, menu_order || 0, status || 'draft', userId, publishedAt]
    );

    const [newPost] = await db.query<RowDataPacket[]>(
      'SELECT * FROM posts WHERE id = ?',
      [result.insertId]
    );

    return NextResponse.json({ post: newPost[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating post:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

