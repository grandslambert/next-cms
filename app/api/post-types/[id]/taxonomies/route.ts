import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Get taxonomies for a specific post type
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT t.*
       FROM taxonomies t
       INNER JOIN post_type_taxonomies ptt ON ptt.taxonomy_id = t.id
       WHERE ptt.post_type_id = ?
       ORDER BY t.label ASC`,
      [params.id]
    );

    return NextResponse.json({ taxonomies: rows });
  } catch (error) {
    console.error('Error fetching post type taxonomies:', error);
    return NextResponse.json({ error: 'Failed to fetch post type taxonomies' }, { status: 500 });
  }
}

// Set taxonomies for a specific post type (replaces all existing)
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
    const { taxonomy_ids } = body;

    // Remove existing relationships
    await db.query<ResultSetHeader>(
      'DELETE FROM post_type_taxonomies WHERE post_type_id = ?',
      [params.id]
    );

    // Add new relationships
    if (taxonomy_ids && taxonomy_ids.length > 0) {
      const values = taxonomy_ids.map((taxonomyId: number) => [params.id, taxonomyId]);
      await db.query<ResultSetHeader>(
        'INSERT INTO post_type_taxonomies (post_type_id, taxonomy_id) VALUES ?',
        [values]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating post type taxonomies:', error);
    return NextResponse.json({ error: 'Failed to update post type taxonomies' }, { status: 500 });
  }
}

