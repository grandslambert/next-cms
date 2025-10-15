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

    const body = await request.json();
    const { title, content, excerpt, featured_image_id, status, parent_id, menu_order } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const slug = slugify(title);
    const publishedAt = status === 'published' ? new Date() : null;

    await db.query<ResultSetHeader>(
      `UPDATE posts 
       SET title = ?, slug = ?, content = ?, excerpt = ?, featured_image_id = ?, parent_id = ?, menu_order = ?, status = ?, published_at = ?
       WHERE id = ?`,
      [title, slug, content || '', excerpt || '', featured_image_id || null, parent_id || null, menu_order || 0, status || 'draft', publishedAt, params.id]
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

    await db.query<ResultSetHeader>('DELETE FROM posts WHERE id = ?', [params.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}

