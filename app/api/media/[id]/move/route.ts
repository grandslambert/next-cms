import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

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

    const siteId = (session.user as any).currentSiteId || 1;
    const mediaTable = getSiteTable(siteId, 'media');
    const foldersTable = getSiteTable(siteId, 'media_folders');

    const body = await request.json();
    const { folder_id } = body;

    // Check if media item exists
    const [media] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${mediaTable} WHERE id = ?`,
      [params.id]
    );

    if (media.length === 0) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // If folder_id is provided, verify it exists
    if (folder_id) {
      const [folder] = await db.query<RowDataPacket[]>(
        `SELECT * FROM ${foldersTable} WHERE id = ?`,
        [folder_id]
      );

      if (folder.length === 0) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }
    }

    // Move media to folder (or root if folder_id is null)
    await db.execute<ResultSetHeader>(
      `UPDATE ${mediaTable} SET folder_id = ? WHERE id = ?`,
      [folder_id || null, params.id]
    );

    const [updated] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${mediaTable} WHERE id = ?`,
      [params.id]
    );

    return NextResponse.json({ media: updated[0] });
  } catch (error) {
    console.error('Error moving media:', error);
    return NextResponse.json({ error: 'Failed to move media' }, { status: 500 });
  }
}

