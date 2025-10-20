import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Get terms for a specific post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const siteId = (session?.user as any)?.currentSiteId || 1;
    
    const termsTable = getSiteTable(siteId, 'terms');
    const termRelationshipsTable = getSiteTable(siteId, 'term_relationships');
    const taxonomiesTable = getSiteTable(siteId, 'taxonomies');
    const mediaTable = getSiteTable(siteId, 'media');
    
    const searchParams = request.nextUrl.searchParams;
    const taxonomyId = searchParams.get('taxonomy_id');

    let query = `
      SELECT t.*, tax.name as taxonomy_name, tax.hierarchical,
             m.url as image_url, m.sizes as image_sizes
      FROM ${termsTable} t
      INNER JOIN ${termRelationshipsTable} tr ON tr.term_id = t.id
      INNER JOIN ${taxonomiesTable} tax ON t.taxonomy_id = tax.id
      LEFT JOIN ${mediaTable} m ON t.image_id = m.id
      WHERE tr.post_id = ?
    `;
    const queryParams: any[] = [params.id];

    if (taxonomyId) {
      query += ' AND t.taxonomy_id = ?';
      queryParams.push(taxonomyId);
    }

    query += ' ORDER BY t.name ASC';

    const [rows] = await db.query<RowDataPacket[]>(query, queryParams);

    return NextResponse.json({ terms: rows });
  } catch (error) {
    console.error('Error fetching post terms:', error);
    return NextResponse.json({ error: 'Failed to fetch post terms' }, { status: 500 });
  }
}

// Set terms for a specific post (replaces all existing terms for the given taxonomy)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteId = (session.user as any).currentSiteId || 1;
    const termsTable = getSiteTable(siteId, 'terms');
    const termRelationshipsTable = getSiteTable(siteId, 'term_relationships');

    const body = await request.json();
    const { term_ids, taxonomy_id } = body;

    if (!taxonomy_id) {
      return NextResponse.json({ error: 'Taxonomy ID is required' }, { status: 400 });
    }

    // Remove existing relationships for this taxonomy
    await db.query<ResultSetHeader>(
      `DELETE FROM ${termRelationshipsTable} 
       WHERE post_id = ? 
       AND term_id IN (SELECT id FROM ${termsTable} WHERE taxonomy_id = ?)`,
      [params.id, taxonomy_id]
    );

    // Add new relationships
    if (term_ids && term_ids.length > 0) {
      const values = term_ids.map((termId: number) => [params.id, termId]);
      await db.query<ResultSetHeader>(
        `INSERT INTO ${termRelationshipsTable} (post_id, term_id) VALUES ?`,
        [values]
      );

      // Update term counts
      await db.query<ResultSetHeader>(
        `UPDATE ${termsTable} 
         SET count = (SELECT COUNT(*) FROM ${termRelationshipsTable} WHERE term_id = ${termsTable}.id)
         WHERE taxonomy_id = ?`,
        [taxonomy_id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating post terms:', error);
    return NextResponse.json({ error: 'Failed to update post terms' }, { status: 500 });
  }
}

