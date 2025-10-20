import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Get taxonomies for a specific post type
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const siteId = (session?.user as any)?.currentSiteId || 1;
    const taxonomiesTable = getSiteTable(siteId, 'taxonomies');
    const postTypeTaxonomiesTable = getSiteTable(siteId, 'post_type_taxonomies');
    
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT t.*
       FROM ${taxonomiesTable} t
       INNER JOIN ${postTypeTaxonomiesTable} ptt ON ptt.taxonomy_id = t.id
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
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin || false;
    const userRole = (session?.user as any)?.role;
    
    if (!session?.user || (!isSuperAdmin && userRole !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const siteId = (session.user as any).currentSiteId || 1;
    const postTypeTaxonomiesTable = getSiteTable(siteId, 'post_type_taxonomies');

    const body = await request.json();
    const { taxonomy_ids } = body;

    // Remove existing relationships
    await db.query<ResultSetHeader>(
      `DELETE FROM ${postTypeTaxonomiesTable} WHERE post_type_id = ?`,
      [params.id]
    );

    // Add new relationships
    if (taxonomy_ids && taxonomy_ids.length > 0) {
      const values = taxonomy_ids.map((taxonomyId: number) => [params.id, taxonomyId]);
      await db.query<ResultSetHeader>(
        `INSERT INTO ${postTypeTaxonomiesTable} (post_type_id, taxonomy_id) VALUES ?`,
        [values]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating post type taxonomies:', error);
    return NextResponse.json({ error: 'Failed to update post type taxonomies' }, { status: 500 });
  }
}

