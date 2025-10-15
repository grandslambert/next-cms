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
      'SELECT * FROM taxonomies WHERE id = ?',
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Taxonomy not found' }, { status: 404 });
    }

    return NextResponse.json({ taxonomy: rows[0] });
  } catch (error) {
    console.error('Error fetching taxonomy:', error);
    return NextResponse.json({ error: 'Failed to fetch taxonomy' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await request.json();
    const { label, singular_label, description, hierarchical, show_in_menu, show_in_dashboard, menu_position } = body;

    await db.query<ResultSetHeader>(
      `UPDATE taxonomies 
       SET label = ?, singular_label = ?, description = ?, hierarchical = ?, show_in_menu = ?, show_in_dashboard = ?, menu_position = ?
       WHERE id = ?`,
      [
        label,
        singular_label,
        description || '',
        hierarchical || false,
        show_in_menu !== false,
        show_in_dashboard || false,
        menu_position || 20,
        params.id
      ]
    );

    const [updated] = await db.query<RowDataPacket[]>(
      'SELECT * FROM taxonomies WHERE id = ?',
      [params.id]
    );

    return NextResponse.json({ taxonomy: updated[0] });
  } catch (error) {
    console.error('Error updating taxonomy:', error);
    return NextResponse.json({ error: 'Failed to update taxonomy' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    // Check if it's a built-in taxonomy
    const [taxonomy] = await db.query<RowDataPacket[]>(
      'SELECT name FROM taxonomies WHERE id = ?',
      [params.id]
    );

    if (taxonomy.length === 0) {
      return NextResponse.json({ error: 'Taxonomy not found' }, { status: 404 });
    }

    if (taxonomy[0].name === 'category' || taxonomy[0].name === 'tag') {
      return NextResponse.json({ 
        error: `Cannot delete the built-in "${taxonomy[0].name}" taxonomy` 
      }, { status: 400 });
    }

    // Check if any terms use this taxonomy
    const [termCount] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM terms WHERE taxonomy_id = ?',
      [params.id]
    );

    if (termCount[0].count > 0) {
      return NextResponse.json({ 
        error: `Cannot delete taxonomy "${taxonomy[0].name}" because it has ${termCount[0].count} associated terms.` 
      }, { status: 400 });
    }

    await db.query<ResultSetHeader>('DELETE FROM taxonomies WHERE id = ?', [params.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting taxonomy:', error);
    return NextResponse.json({ error: 'Failed to delete taxonomy' }, { status: 500 });
  }
}

