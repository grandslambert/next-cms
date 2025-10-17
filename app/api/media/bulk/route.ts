import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getSiteTable } from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { action, media_ids, folder_id } = body;

    if (!media_ids || !Array.isArray(media_ids) || media_ids.length === 0) {
      return NextResponse.json({ error: 'No media items selected' }, { status: 400 });
    }

    const placeholders = media_ids.map(() => '?').join(',');

    switch (action) {
      case 'trash':
        // Move to trash
        await db.execute<ResultSetHeader>(
          `UPDATE ${mediaTable} SET deleted_at = NOW() WHERE id IN (${placeholders})`,
          media_ids
        );
        return NextResponse.json({ 
          message: `${media_ids.length} item${media_ids.length !== 1 ? 's' : ''} moved to trash` 
        });

      case 'restore':
        // Restore from trash
        await db.execute<ResultSetHeader>(
          `UPDATE ${mediaTable} SET deleted_at = NULL WHERE id IN (${placeholders})`,
          media_ids
        );
        return NextResponse.json({ 
          message: `${media_ids.length} item${media_ids.length !== 1 ? 's' : ''} restored` 
        });

      case 'move':
        // Move to folder
        if (folder_id === undefined) {
          return NextResponse.json({ error: 'Folder ID required for move action' }, { status: 400 });
        }
        await db.execute<ResultSetHeader>(
          `UPDATE ${mediaTable} SET folder_id = ? WHERE id IN (${placeholders})`,
          [folder_id, ...media_ids]
        );
        return NextResponse.json({ 
          message: `${media_ids.length} item${media_ids.length !== 1 ? 's' : ''} moved` 
        });

      case 'permanent-delete':
        // Permanently delete (only from trash)
        await db.execute<ResultSetHeader>(
          `DELETE FROM ${mediaTable} WHERE id IN (${placeholders}) AND deleted_at IS NOT NULL`,
          media_ids
        );
        return NextResponse.json({ 
          message: `${media_ids.length} item${media_ids.length !== 1 ? 's' : ''} permanently deleted` 
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error performing bulk action:', error);
    return NextResponse.json({ error: 'Failed to perform bulk action' }, { status: 500 });
  }
}

