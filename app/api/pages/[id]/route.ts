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
       FROM pages p 
       LEFT JOIN users u ON p.author_id = u.id
       LEFT JOIN media m ON p.featured_image_id = m.id
       WHERE p.id = ?`,
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json({ page: rows[0] });
  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json({ error: 'Failed to fetch page' }, { status: 500 });
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
    const { title, content, featured_image_id, status, parent_id, menu_order } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const slug = slugify(title);
    const publishedAt = status === 'published' ? new Date() : null;

    await db.query<ResultSetHeader>(
      `UPDATE pages 
       SET title = ?, slug = ?, content = ?, featured_image_id = ?, status = ?, parent_id = ?, menu_order = ?, published_at = ?
       WHERE id = ?`,
      [title, slug, content || '', featured_image_id || null, status || 'draft', parent_id || null, menu_order || 0, publishedAt, params.id]
    );

    const [updatedPage] = await db.query<RowDataPacket[]>(
      'SELECT * FROM pages WHERE id = ?',
      [params.id]
    );

    return NextResponse.json({ page: updatedPage[0] });
  } catch (error: any) {
    console.error('Error updating page:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A page with this slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
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

    await db.query<ResultSetHeader>('DELETE FROM pages WHERE id = ?', [params.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 });
  }
}

