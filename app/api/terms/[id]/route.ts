import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getSiteTable } from '@/lib/db';
import { slugify } from '@/lib/utils';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const siteId = (session?.user as any)?.currentSiteId || 1;
    const termsTable = getSiteTable(siteId, 'terms');
    const taxonomiesTable = getSiteTable(siteId, 'taxonomies');
    const mediaTable = getSiteTable(siteId, 'media');
    
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT t.*, tax.name as taxonomy_name, tax.hierarchical,
              m.url as image_url, m.sizes as image_sizes
       FROM ${termsTable} t
       INNER JOIN ${taxonomiesTable} tax ON t.taxonomy_id = tax.id
       LEFT JOIN ${mediaTable} m ON t.image_id = m.id
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

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId || 1;
    const termsTable = getSiteTable(siteId, 'terms');
    const taxonomiesTable = getSiteTable(siteId, 'taxonomies');
    const mediaTable = getSiteTable(siteId, 'media');

    const body = await request.json();
    const { name, description, image_id, parent_id } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = slugify(name);

    // Get current term BEFORE updating (for activity log)
    const [beforeUpdate] = await db.query<RowDataPacket[]>(
      `SELECT t.*, tax.name as taxonomy_name
       FROM ${termsTable} t
       INNER JOIN ${taxonomiesTable} tax ON t.taxonomy_id = tax.id
       WHERE t.id = ?`,
      [params.id]
    );

    if (beforeUpdate.length === 0) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    const currentTerm = beforeUpdate[0];

    // Check if new slug already exists for this taxonomy (excluding current term)
    const [existing] = await db.query<RowDataPacket[]>(
      `SELECT id FROM ${termsTable} WHERE taxonomy_id = ? AND slug = ? AND id != ?`,
      [currentTerm.taxonomy_id, slug, params.id]
    );

    if (existing.length > 0) {
      return NextResponse.json({ 
        error: 'A term with this name already exists in this taxonomy' 
      }, { status: 409 });
    }

    await db.query<ResultSetHeader>(
      `UPDATE ${termsTable} 
       SET name = ?, slug = ?, description = ?, image_id = ?, parent_id = ?
       WHERE id = ?`,
      [name, slug, description || '', image_id || null, parent_id || null, params.id]
    );

    const [updated] = await db.query<RowDataPacket[]>(
      `SELECT t.*, tax.name as taxonomy_name, tax.hierarchical,
              m.url as image_url, m.sizes as image_sizes
       FROM ${termsTable} t
       INNER JOIN ${taxonomiesTable} tax ON t.taxonomy_id = tax.id
       LEFT JOIN ${mediaTable} m ON t.image_id = m.id
       WHERE t.id = ?`,
      [params.id]
    );

    // Prepare before/after changes
    const changesBefore = {
      name: currentTerm.name,
      slug: currentTerm.slug,
      description: currentTerm.description,
      image_id: currentTerm.image_id,
      parent_id: currentTerm.parent_id,
    };

    const changesAfter = {
      name: updated[0].name,
      slug: updated[0].slug,
      description: updated[0].description,
      image_id: updated[0].image_id,
      parent_id: updated[0].parent_id,
    };

    // Log activity
    await logActivity({
      userId,
      action: 'term_updated',
      entityType: 'term',
      entityId: Number.parseInt(params.id),
      entityName: name,
      details: `Updated term: ${name} in ${updated[0].taxonomy_name}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      changesBefore,
      changesAfter,
      siteId,
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

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId || 1;
    const termsTable = getSiteTable(siteId, 'terms');
    const taxonomiesTable = getSiteTable(siteId, 'taxonomies');

    // Get term details for logging
    const [termRows] = await db.query<RowDataPacket[]>(
      `SELECT t.name, tax.name as taxonomy_name
       FROM ${termsTable} t
       INNER JOIN ${taxonomiesTable} tax ON t.taxonomy_id = tax.id
       WHERE t.id = ?`,
      [params.id]
    );

    if (termRows.length === 0) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    const term = termRows[0];

    // Check if term has children
    const [children] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM ${termsTable} WHERE parent_id = ?`,
      [params.id]
    );

    if (children[0].count > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete term that has child terms. Delete children first.' 
      }, { status: 400 });
    }

    // Log activity before deleting
    await logActivity({
      userId,
      action: 'term_deleted',
      entityType: 'term',
      entityId: Number.parseInt(params.id),
      entityName: term.name,
      details: `Deleted term: ${term.name} from ${term.taxonomy_name}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    await db.query<ResultSetHeader>(`DELETE FROM ${termsTable} WHERE id = ?`, [params.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting term:', error);
    return NextResponse.json({ error: 'Failed to delete term' }, { status: 500 });
  }
}

