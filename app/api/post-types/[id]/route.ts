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
    const { slug, label, singular_label, description, icon, url_structure, supports, menu_position, show_in_dashboard, hierarchical } = body;

    // Check if it's a built-in type
    const [currentType] = await db.query<RowDataPacket[]>(
      'SELECT name FROM post_types WHERE id = ?',
      [params.id]
    );

    if (currentType.length === 0) {
      return NextResponse.json({ error: 'Post type not found' }, { status: 404 });
    }

    const isBuiltIn = currentType[0].name === 'post' || currentType[0].name === 'page';

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

    const [updated] = await db.query<RowDataPacket[]>(
      'SELECT * FROM post_types WHERE id = ?',
      [params.id]
    );

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
    const [postCount] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM posts WHERE post_type = ?',
      [postType[0].name]
    );

    if (postCount[0].count > 0) {
      return NextResponse.json({ 
        error: `Cannot delete post type with ${postCount[0].count} existing posts` 
      }, { status: 400 });
    }

    await db.query<ResultSetHeader>('DELETE FROM post_types WHERE id = ?', [params.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post type:', error);
    return NextResponse.json({ error: 'Failed to delete post type' }, { status: 500 });
  }
}

