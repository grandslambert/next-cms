import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT c.* FROM categories c
       INNER JOIN post_categories pc ON c.id = pc.category_id
       WHERE pc.post_id = ?`,
      [params.id]
    );

    return NextResponse.json({ categories: rows });
  } catch (error) {
    console.error('Error fetching post categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
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
    const { categoryIds } = body;

    // Delete existing categories
    await db.query<ResultSetHeader>(
      'DELETE FROM post_categories WHERE post_id = ?',
      [params.id]
    );

    // Insert new categories
    if (categoryIds && categoryIds.length > 0) {
      for (const categoryId of categoryIds) {
        await db.query<ResultSetHeader>(
          'INSERT INTO post_categories (post_id, category_id) VALUES (?, ?)',
          [params.id, categoryId]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating post categories:', error);
    return NextResponse.json({ error: 'Failed to update categories' }, { status: 500 });
  }
}

