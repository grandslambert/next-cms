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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = (session.user as any).permissions || {};
    if (!permissions.manage_media) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM media_folders WHERE id = ?',
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ folder: rows[0] });
  } catch (error) {
    console.error('Error fetching folder:', error);
    return NextResponse.json({ error: 'Failed to fetch folder' }, { status: 500 });
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

    const permissions = (session.user as any).permissions || {};
    if (!permissions.manage_media) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, parent_id } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    // Check if folder exists
    const [existing] = await db.query<RowDataPacket[]>(
      'SELECT * FROM media_folders WHERE id = ?',
      [params.id]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Prevent circular references
    if (parent_id && parent_id === parseInt(params.id)) {
      return NextResponse.json({ error: 'A folder cannot be its own parent' }, { status: 400 });
    }

    await db.execute<ResultSetHeader>(
      'UPDATE media_folders SET name = ?, parent_id = ? WHERE id = ?',
      [name.trim(), parent_id || null, params.id]
    );

    const [updated] = await db.query<RowDataPacket[]>(
      'SELECT * FROM media_folders WHERE id = ?',
      [params.id]
    );

    return NextResponse.json({ folder: updated[0] });
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
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

    const permissions = (session.user as any).permissions || {};
    if (!permissions.manage_media) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if folder has any media files
    const [mediaFiles] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM media WHERE folder_id = ?',
      [params.id]
    );

    if (mediaFiles[0].count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete folder with media files. Please move or delete the files first.' },
        { status: 400 }
      );
    }

    // Check if folder has subfolders
    const [subfolders] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM media_folders WHERE parent_id = ?',
      [params.id]
    );

    if (subfolders[0].count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete folder with subfolders. Please delete subfolders first.' },
        { status: 400 }
      );
    }

    await db.execute<ResultSetHeader>(
      'DELETE FROM media_folders WHERE id = ?',
      [params.id]
    );

    return NextResponse.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}

