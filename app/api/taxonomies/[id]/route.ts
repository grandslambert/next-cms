import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const siteId = (session?.user as any)?.currentSiteId || 1;
    const taxonomiesTable = getSiteTable(siteId, 'taxonomies');
    
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${taxonomiesTable} WHERE id = ?`,
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

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId || 1;
    const taxonomiesTable = getSiteTable(siteId, 'taxonomies');

    const body = await request.json();
    const { label, singular_label, description, hierarchical, show_in_menu, show_in_dashboard, menu_position } = body;

    // Get current taxonomy BEFORE updating (for activity log)
    const [beforeUpdate] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${taxonomiesTable} WHERE id = ?`,
      [params.id]
    );

    if (beforeUpdate.length === 0) {
      return NextResponse.json({ error: 'Taxonomy not found' }, { status: 404 });
    }

    const currentTaxonomy = beforeUpdate[0];

    await db.query<ResultSetHeader>(
      `UPDATE ${taxonomiesTable} 
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
      `SELECT * FROM ${taxonomiesTable} WHERE id = ?`,
      [params.id]
    );

    // Prepare before/after changes
    const changesBefore = {
      label: currentTaxonomy.label,
      singular_label: currentTaxonomy.singular_label,
      description: currentTaxonomy.description,
      hierarchical: currentTaxonomy.hierarchical,
      show_in_menu: currentTaxonomy.show_in_menu,
      show_in_dashboard: currentTaxonomy.show_in_dashboard,
      menu_position: currentTaxonomy.menu_position,
    };

    const changesAfter = {
      label: updated[0].label,
      singular_label: updated[0].singular_label,
      description: updated[0].description,
      hierarchical: updated[0].hierarchical,
      show_in_menu: updated[0].show_in_menu,
      show_in_dashboard: updated[0].show_in_dashboard,
      menu_position: updated[0].menu_position,
    };

    // Log activity
    await logActivity({
      userId,
      action: 'taxonomy_updated',
      entityType: 'taxonomy',
      entityId: Number.parseInt(params.id),
      entityName: label,
      details: `Updated taxonomy: ${label}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      changesBefore,
      changesAfter,
      siteId,
    });

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

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId || 1;
    const taxonomiesTable = getSiteTable(siteId, 'taxonomies');
    const termsTable = getSiteTable(siteId, 'terms');

    // Check if it's a built-in taxonomy
    const [taxonomy] = await db.query<RowDataPacket[]>(
      `SELECT name FROM ${taxonomiesTable} WHERE id = ?`,
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
      `SELECT COUNT(*) as count FROM ${termsTable} WHERE taxonomy_id = ?`,
      [params.id]
    );

    if (termCount[0].count > 0) {
      return NextResponse.json({ 
        error: `Cannot delete taxonomy "${taxonomy[0].name}" because it has ${termCount[0].count} associated terms.` 
      }, { status: 400 });
    }

    // Log activity before deleting
    await logActivity({
      userId,
      action: 'taxonomy_deleted',
      entityType: 'taxonomy',
      entityId: Number.parseInt(params.id),
      entityName: taxonomy[0].name,
      details: `Deleted taxonomy: ${taxonomy[0].name}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    await db.query<ResultSetHeader>(`DELETE FROM ${taxonomiesTable} WHERE id = ?`, [params.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting taxonomy:', error);
    return NextResponse.json({ error: 'Failed to delete taxonomy' }, { status: 500 });
  }
}

