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

    let query = `
      SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as author_name,
             m.url as featured_image_url, m.sizes as featured_image_sizes
      FROM pages p 
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN media m ON p.featured_image_id = m.id
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      query += ' WHERE p.status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.menu_order ASC, p.created_at DESC';

    const [rows] = await db.query<RowDataPacket[]>(query, params);

    return NextResponse.json({ pages: rows });
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const userId = (session.user as any).id;
    const publishedAt = status === 'published' ? new Date() : null;

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO pages (title, slug, content, featured_image_id, status, author_id, parent_id, menu_order, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, content || '', featured_image_id || null, status || 'draft', userId, parent_id || null, menu_order || 0, publishedAt]
    );

    const [newPage] = await db.query<RowDataPacket[]>(
      'SELECT * FROM pages WHERE id = ?',
      [result.insertId]
    );

    return NextResponse.json({ page: newPage[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating page:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A page with this slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 });
  }
}

