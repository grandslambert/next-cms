import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM post_types ORDER BY menu_position ASC, name ASC'
    );
    
    // Parse JSON supports field
    const postTypes = rows.map((row: any) => ({
      ...row,
      supports: row.supports ? JSON.parse(row.supports) : {}
    }));

    return NextResponse.json({ postTypes });
  } catch (error) {
    console.error('Error fetching post types:', error);
    return NextResponse.json({ error: 'Failed to fetch post types' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, label, singular_label, description, icon, url_structure, supports, menu_position, show_in_dashboard, hierarchical } = body;

    if (!name || !label || !singular_label) {
      return NextResponse.json({ error: 'Name, label, and singular label are required' }, { status: 400 });
    }

    // Validate name format (lowercase, alphanumeric, underscores only)
    if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
      return NextResponse.json({ 
        error: 'Name must be lowercase alphanumeric with underscores only' 
      }, { status: 400 });
    }

    // Use slug or default to name
    const postTypeSlug = slug || name;

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO post_types (name, slug, label, singular_label, description, icon, url_structure, supports, show_in_dashboard, hierarchical, menu_position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        postTypeSlug,
        label,
        singular_label,
        description || '',
        icon || '📄',
        url_structure || 'default',
        JSON.stringify(supports || {}),
        show_in_dashboard !== false,
        hierarchical || false,
        menu_position || 5
      ]
    );

    const [newPostType] = await db.query<RowDataPacket[]>(
      'SELECT * FROM post_types WHERE id = ?',
      [result.insertId]
    );

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'post_type_created',
      entityType: 'post_type',
      entityId: result.insertId,
      entityName: label,
      details: `Created post type: ${label} (${name})`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ 
      postType: {
        ...newPostType[0],
        supports: JSON.parse(newPostType[0].supports)
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating post type:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Post type with this name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create post type' }, { status: 500 });
  }
}

