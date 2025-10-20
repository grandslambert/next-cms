import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = (session.user as any).permissions || {};
    const siteId = (session.user as any).currentSiteId || 1;
    const mediaFoldersTable = getSiteTable(siteId, 'media_folders');
    const mediaTable = getSiteTable(siteId, 'media');
    
    if (!permissions.manage_media) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const parentId = searchParams.get('parent_id');

    let query = `
      SELECT mf.*, 
             COUNT(DISTINCT m.id) as file_count,
             COUNT(DISTINCT sub.id) as subfolder_count
      FROM ${mediaFoldersTable} mf
      LEFT JOIN ${mediaTable} m ON m.folder_id = mf.id AND m.deleted_at IS NULL
      LEFT JOIN ${mediaFoldersTable} sub ON sub.parent_id = mf.id
    `;
    const params: any[] = [];

    if (parentId) {
      if (parentId === 'null' || parentId === '0') {
        query += ' WHERE mf.parent_id IS NULL';
      } else {
        query += ' WHERE mf.parent_id = ?';
        params.push(Number.parseInt(parentId));
      }
    }

    query += ' GROUP BY mf.id ORDER BY mf.name ASC';

    const [rows] = await db.query<RowDataPacket[]>(query, params);

    return NextResponse.json({ folders: rows });
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = (session.user as any).permissions || {};
    const siteId = (session.user as any).currentSiteId || 1;
    const mediaFoldersTable = getSiteTable(siteId, 'media_folders');
    
    if (!permissions.manage_media) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, parent_id } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO ${mediaFoldersTable} (name, parent_id) VALUES (?, ?)`,
      [name.trim(), parent_id || null]
    );

    const [newFolder] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${mediaFoldersTable} WHERE id = ?`,
      [result.insertId]
    );

    return NextResponse.json({ folder: newFolder[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}

