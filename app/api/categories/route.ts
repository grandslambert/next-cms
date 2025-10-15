import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { slugify } from '@/lib/utils';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT c.*, m.url as image_url, m.sizes as image_sizes
       FROM categories c
       LEFT JOIN media m ON c.image_id = m.id
       ORDER BY c.name ASC`
    );

    return NextResponse.json({ categories: rows });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, image_id } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = slugify(name);

    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO categories (name, slug, description, image_id) VALUES (?, ?, ?, ?)',
      [name, slug, description || '', image_id || null]
    );

    const [newCategory] = await db.query<RowDataPacket[]>(
      'SELECT * FROM categories WHERE id = ?',
      [result.insertId]
    );

    return NextResponse.json({ category: newCategory[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating category:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A category with this slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

