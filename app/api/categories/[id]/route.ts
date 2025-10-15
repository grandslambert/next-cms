import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { slugify } from '@/lib/utils';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.query<ResultSetHeader>('DELETE FROM categories WHERE id = ?', [params.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
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
    const { name, description, image_id } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = slugify(name);

    await db.query<ResultSetHeader>(
      'UPDATE categories SET name = ?, slug = ?, description = ?, image_id = ? WHERE id = ?',
      [name, slug, description || '', image_id || null, params.id]
    );

    const [updated] = await db.query<RowDataPacket[]>(
      'SELECT * FROM categories WHERE id = ?',
      [params.id]
    );

    return NextResponse.json({ category: updated[0] });
  } catch (error: any) {
    console.error('Error updating category:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A category with this slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

