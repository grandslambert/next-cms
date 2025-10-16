import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { slugify } from '@/lib/utils';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT t.*, tax.name as taxonomy_name, tax.hierarchical,
              m.url as image_url, m.sizes as image_sizes
       FROM terms t
       INNER JOIN taxonomies tax ON t.taxonomy_id = tax.id
       LEFT JOIN media m ON t.image_id = m.id
       WHERE t.id = ?`,
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    return NextResponse.json({ term: rows[0] });
  } catch (error) {
    console.error('Error fetching term:', error);
    return NextResponse.json({ error: 'Failed to fetch term' }, { status: 500 });
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
    const { name, description, image_id, parent_id } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = slugify(name);

    // Get current term to check taxonomy
    const [currentTerm] = await db.query<RowDataPacket[]>(
      'SELECT taxonomy_id FROM terms WHERE id = ?',
      [params.id]
    );

    if (currentTerm.length === 0) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    // Check if new slug already exists for this taxonomy (excluding current term)
    const [existing] = await db.query<RowDataPacket[]>(
      'SELECT id FROM terms WHERE taxonomy_id = ? AND slug = ? AND id != ?',
      [currentTerm[0].taxonomy_id, slug, params.id]
    );

    if (existing.length > 0) {
      return NextResponse.json({ 
        error: 'A term with this name already exists in this taxonomy' 
      }, { status: 409 });
    }

    await db.query<ResultSetHeader>(
      `UPDATE terms 
       SET name = ?, slug = ?, description = ?, image_id = ?, parent_id = ?
       WHERE id = ?`,
      [name, slug, description || '', image_id || null, parent_id || null, params.id]
    );

    const [updated] = await db.query<RowDataPacket[]>(
      `SELECT t.*, tax.name as taxonomy_name, tax.hierarchical,
              m.url as image_url, m.sizes as image_sizes
       FROM terms t
       INNER JOIN taxonomies tax ON t.taxonomy_id = tax.id
       LEFT JOIN media m ON t.image_id = m.id
       WHERE t.id = ?`,
      [params.id]
    );

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'term_updated',
      entityType: 'term',
      entityId: Number.parseInt(params.id),
      entityName: name,
      details: `Updated term: ${name} in ${updated[0].taxonomy_name}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ term: updated[0] });
  } catch (error: any) {
    console.error('Error updating term:', error);
    return NextResponse.json({ error: 'Failed to update term' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get term details for logging
    const [termRows] = await db.query<RowDataPacket[]>(
      `SELECT t.name, tax.name as taxonomy_name
       FROM terms t
       INNER JOIN taxonomies tax ON t.taxonomy_id = tax.id
       WHERE t.id = ?`,
      [params.id]
    );

    if (termRows.length === 0) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    const term = termRows[0];

    // Check if term has children
    const [children] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM terms WHERE parent_id = ?',
      [params.id]
    );

    if (children[0].count > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete term that has child terms. Delete children first.' 
      }, { status: 400 });
    }

    // Log activity before deleting
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'term_deleted',
      entityType: 'term',
      entityId: Number.parseInt(params.id),
      entityName: term.name,
      details: `Deleted term: ${term.name} from ${term.taxonomy_name}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    await db.query<ResultSetHeader>('DELETE FROM terms WHERE id = ?', [params.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting term:', error);
    return NextResponse.json({ error: 'Failed to delete term' }, { status: 500 });
  }
}

