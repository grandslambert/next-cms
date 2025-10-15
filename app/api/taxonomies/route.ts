import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM taxonomies ORDER BY menu_position ASC, label ASC'
    );
    return NextResponse.json({ taxonomies: rows });
  } catch (error) {
    console.error('Error fetching taxonomies:', error);
    return NextResponse.json({ error: 'Failed to fetch taxonomies' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await request.json();
    const { name, label, singular_label, description, hierarchical, show_in_menu, menu_position } = body;

    if (!name || !label || !singular_label) {
      return NextResponse.json({ error: 'Name, label, and singular label are required' }, { status: 400 });
    }

    // Validate name format (lowercase, alphanumeric, underscores only)
    if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
      return NextResponse.json({ 
        error: 'Name must be lowercase alphanumeric with underscores only' 
      }, { status: 400 });
    }

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO taxonomies (name, label, singular_label, description, hierarchical, show_in_menu, menu_position)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        label,
        singular_label,
        description || '',
        hierarchical || false,
        show_in_menu !== false,
        menu_position || 20
      ]
    );

    const [newTaxonomy] = await db.query<RowDataPacket[]>(
      'SELECT * FROM taxonomies WHERE id = ?',
      [result.insertId]
    );

    return NextResponse.json({ taxonomy: newTaxonomy[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating taxonomy:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A taxonomy with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create taxonomy' }, { status: 500 });
  }
}

