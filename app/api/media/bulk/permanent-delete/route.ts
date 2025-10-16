import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

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

    const body = await request.json();
    const { media_ids } = body;

    if (!media_ids || !Array.isArray(media_ids) || media_ids.length === 0) {
      return NextResponse.json({ error: 'No media items selected' }, { status: 400 });
    }

    const placeholders = media_ids.map(() => '?').join(',');

    // Get all media to delete files
    const [mediaItems] = await db.query<RowDataPacket[]>(
      `SELECT * FROM media WHERE id IN (${placeholders}) AND deleted_at IS NOT NULL`,
      media_ids
    );

    let deletedCount = 0;

    // Delete files from filesystem
    for (const media of mediaItems) {
      if (media.sizes) {
        try {
          const sizes = JSON.parse(media.sizes);
          for (const [sizeName, sizeData] of Object.entries(sizes)) {
            const sizeUrl = (sizeData as any).url;
            const filepath = path.join(process.cwd(), 'public', sizeUrl);
            try {
              await unlink(filepath);
            } catch (error) {
              // File might not exist, continue
            }
          }
        } catch (error) {
          console.error('Error deleting sized files:', error);
        }
      } else {
        // Old format - just delete main file
        const filepath = path.join(process.cwd(), 'public', media.url);
        try {
          await unlink(filepath);
        } catch (error) {
          console.error('Error deleting file:', error);
        }
      }
      deletedCount++;
    }

    // Permanently delete from database
    await db.execute<ResultSetHeader>(
      `DELETE FROM media WHERE id IN (${placeholders})`,
      media_ids
    );

    return NextResponse.json({ 
      message: `Permanently deleted ${deletedCount} item${deletedCount !== 1 ? 's' : ''}` 
    });
  } catch (error) {
    console.error('Error permanently deleting media:', error);
    return NextResponse.json({ error: 'Failed to permanently delete media' }, { status: 500 });
  }
}

