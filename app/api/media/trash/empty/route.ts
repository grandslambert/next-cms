import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import db, { getSiteTable } from '@/lib/db';
import { unlink } from 'fs/promises';
import path from 'path';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function DELETE(request: NextRequest) {
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

    // Get all trashed media
    const [trashedMedia] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${mediaTable} WHERE deleted_at IS NOT NULL`
    );

    let deletedCount = 0;

    // Delete files and database records
    for (const media of trashedMedia) {
      // Delete all file sizes from filesystem
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

    // Permanently delete all trashed media from database
    await db.execute<ResultSetHeader>(
      `DELETE FROM ${mediaTable} WHERE deleted_at IS NOT NULL`
    );

    return NextResponse.json({ 
      message: `Permanently deleted ${deletedCount} media file${deletedCount !== 1 ? 's' : ''}`,
      count: deletedCount 
    });
  } catch (error) {
    console.error('Error emptying trash:', error);
    return NextResponse.json({ error: 'Failed to empty trash' }, { status: 500 });
  }
}

