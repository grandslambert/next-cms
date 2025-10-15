import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { slugify } from '@/lib/utils';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taxonomyId = searchParams.get('taxonomy_id');
    const taxonomyName = searchParams.get('taxonomy');

    let query = `
      SELECT t.*, tax.name as taxonomy_name, tax.hierarchical,
             m.url as image_url, m.sizes as image_sizes
      FROM terms t
      INNER JOIN taxonomies tax ON t.taxonomy_id = tax.id
      LEFT JOIN media m ON t.image_id = m.id
    `;
    const params: any[] = [];

    if (taxonomyId) {
      query += ' WHERE t.taxonomy_id = ?';
      params.push(taxonomyId);
    } else if (taxonomyName) {
      query += ' WHERE tax.name = ?';
      params.push(taxonomyName);
    }

    query += ' ORDER BY t.name ASC';

    const [rows] = await db.query<RowDataPacket[]>(query, params);

    return NextResponse.json({ terms: rows });
  } catch (error) {
    console.error('Error fetching terms:', error);
    return NextResponse.json({ error: 'Failed to fetch terms' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { taxonomy_id, name, description, image_id, parent_id } = body;

    if (!taxonomy_id || !name) {
      return NextResponse.json({ error: 'Taxonomy ID and name are required' }, { status: 400 });
    }

    const slug = slugify(name);

    // Check if slug already exists for this taxonomy
    const [existing] = await db.query<RowDataPacket[]>(
      'SELECT id FROM terms WHERE taxonomy_id = ? AND slug = ?',
      [taxonomy_id, slug]
    );

    if (existing.length > 0) {
      return NextResponse.json({ 
        error: 'A term with this name already exists in this taxonomy' 
      }, { status: 409 });
    }

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO terms (taxonomy_id, name, slug, description, image_id, parent_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [taxonomy_id, name, slug, description || '', image_id || null, parent_id || null]
    );

    const [newTerm] = await db.query<RowDataPacket[]>(
      `SELECT t.*, tax.name as taxonomy_name, tax.hierarchical,
              m.url as image_url, m.sizes as image_sizes
       FROM terms t
       INNER JOIN taxonomies tax ON t.taxonomy_id = tax.id
       LEFT JOIN media m ON t.image_id = m.id
       WHERE t.id = ?`,
      [result.insertId]
    );

    return NextResponse.json({ term: newTerm[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating term:', error);
    return NextResponse.json({ error: 'Failed to create term' }, { status: 500 });
  }
}

