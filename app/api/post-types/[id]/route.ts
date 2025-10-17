import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM post_types WHERE id = ?',
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Post type not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      postType: {
        ...rows[0],
        supports: JSON.parse(rows[0].supports || '{}')
      }
    });
  } catch (error) {
    console.error('Error fetching post type:', error);
    return NextResponse.json({ error: 'Failed to fetch post type' }, { status: 500 });
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
    const { slug, label, singular_label, description, icon, url_structure, supports, menu_position, show_in_dashboard, hierarchical, taxonomies } = body;

    // Get current post type BEFORE updating (for activity log)
    const [beforeUpdate] = await db.query<RowDataPacket[]>(
      'SELECT * FROM post_types WHERE id = ?',
      [params.id]
    );

    if (beforeUpdate.length === 0) {
      return NextResponse.json({ error: 'Post type not found' }, { status: 404 });
    }

    const currentType = beforeUpdate[0];
    const isBuiltIn = currentType.name === 'post' || currentType.name === 'page';

    // Get current taxonomies for this post type
    const [beforeTaxonomies] = await db.query<RowDataPacket[]>(
      `SELECT t.id, t.name, t.label
       FROM taxonomies t
       INNER JOIN post_type_taxonomies ptt ON ptt.taxonomy_id = t.id
       WHERE ptt.post_type_id = ?
       ORDER BY t.label ASC`,
      [params.id]
    );

    // Build update query
    let updateQuery = `UPDATE post_types 
       SET label = ?, singular_label = ?, description = ?, icon = ?, url_structure = ?, supports = ?, show_in_dashboard = ?, hierarchical = ?, menu_position = ?`;
    let updateParams: any[] = [
      label,
      singular_label,
      description || '',
      icon || '📄',
      url_structure || 'default',
      JSON.stringify(supports || {}),
      show_in_dashboard !== false,
      hierarchical || false,
      menu_position || 5,
    ];

    // Only allow slug changes for non-built-in types
    if (slug !== undefined && !isBuiltIn) {
      updateQuery = `UPDATE post_types 
         SET slug = ?, label = ?, singular_label = ?, description = ?, icon = ?, url_structure = ?, supports = ?, show_in_dashboard = ?, hierarchical = ?, menu_position = ?`;
      updateParams = [slug, ...updateParams];
    }

    updateQuery += ' WHERE id = ?';
    updateParams.push(params.id);

    await db.query<ResultSetHeader>(updateQuery, updateParams);

    // Update taxonomies if provided
    if (taxonomies !== undefined) {
      // Remove existing relationships
      await db.query<ResultSetHeader>(
        'DELETE FROM post_type_taxonomies WHERE post_type_id = ?',
        [params.id]
      );

      // Add new relationships
      if (taxonomies.length > 0) {
        const values = taxonomies.map((taxonomyId: number) => [params.id, taxonomyId]);
        await db.query<ResultSetHeader>(
          'INSERT INTO post_type_taxonomies (post_type_id, taxonomy_id) VALUES ?',
          [values]
        );
      }
    }

    const [updated] = await db.query<RowDataPacket[]>(
      'SELECT * FROM post_types WHERE id = ?',
      [params.id]
    );

    // Get updated taxonomies for this post type
    const [afterTaxonomies] = await db.query<RowDataPacket[]>(
      `SELECT t.id, t.name, t.label
       FROM taxonomies t
       INNER JOIN post_type_taxonomies ptt ON ptt.taxonomy_id = t.id
       WHERE ptt.post_type_id = ?
       ORDER BY t.label ASC`,
      [params.id]
    );

    // Prepare before/after changes (including taxonomies)
    const changesBefore = {
      slug: currentType.slug,
      label: currentType.label,
      singular_label: currentType.singular_label,
      description: currentType.description,
      icon: currentType.icon,
      url_structure: currentType.url_structure,
      supports: JSON.parse(currentType.supports || '{}'),
      show_in_dashboard: currentType.show_in_dashboard,
      hierarchical: currentType.hierarchical,
      menu_position: currentType.menu_position,
      taxonomies: beforeTaxonomies.map((t: any) => t.label).join(', ') || 'None',
    };

    const changesAfter = {
      slug: updated[0].slug,
      label: updated[0].label,
      singular_label: updated[0].singular_label,
      description: updated[0].description,
      icon: updated[0].icon,
      url_structure: updated[0].url_structure,
      supports: JSON.parse(updated[0].supports || '{}'),
      show_in_dashboard: updated[0].show_in_dashboard,
      hierarchical: updated[0].hierarchical,
      menu_position: updated[0].menu_position,
      taxonomies: afterTaxonomies.map((t: any) => t.label).join(', ') || 'None',
    };

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'post_type_updated',
      entityType: 'post_type',
      entityId: Number.parseInt(params.id),
      entityName: label,
      details: `Updated post type: ${label}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      changesBefore,
      changesAfter,
    });

    return NextResponse.json({ 
      postType: {
        ...updated[0],
        supports: JSON.parse(updated[0].supports)
      }
    });
  } catch (error) {
    console.error('Error updating post type:', error);
    return NextResponse.json({ error: 'Failed to update post type' }, { status: 500 });
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

    // Check if it's a built-in post type
    const [postType] = await db.query<RowDataPacket[]>(
      'SELECT name FROM post_types WHERE id = ?',
      [params.id]
    );

    if (postType.length === 0) {
      return NextResponse.json({ error: 'Post type not found' }, { status: 404 });
    }

    if (postType[0].name === 'post' || postType[0].name === 'page') {
      return NextResponse.json({ 
        error: `Cannot delete the built-in "${postType[0].name}" post type` 
      }, { status: 400 });
    }

    // Check if any posts use this post type
    const postsTable = getSiteTable(siteId, 'posts');
    const [postCount] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM ${postsTable} WHERE post_type = ?`,
      [postType[0].name]
    );

    if (postCount[0].count > 0) {
      return NextResponse.json({ 
        error: `Cannot delete post type with ${postCount[0].count} existing posts` 
      }, { status: 400 });
    }

    // Log activity before deleting
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'post_type_deleted',
      entityType: 'post_type',
      entityId: Number.parseInt(params.id),
      entityName: postType[0].label,
      details: `Deleted post type: ${postType[0].label} (${postType[0].name})`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    await db.query<ResultSetHeader>('DELETE FROM post_types WHERE id = ?', [params.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post type:', error);
    return NextResponse.json({ error: 'Failed to delete post type' }, { status: 500 });
  }
}

