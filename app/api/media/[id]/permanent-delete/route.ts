import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { unlink } from 'fs/promises';
import path from 'path';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

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

    // Get media info
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM media WHERE id = ? AND deleted_at IS NOT NULL',
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Media not found in trash' }, { status: 404 });
    }

    const media = rows[0];

    // Check usage before permanent deletion
    const [postCount] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM posts WHERE featured_image_id = ?',
      [params.id]
    );
    const [termCount] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM terms WHERE image_id = ?',
      [params.id]
    );

    const totalUsage = postCount[0].count + termCount[0].count;
    
    if (totalUsage > 0) {
      console.log(`Media ${params.id} was used in ${totalUsage} location(s) - references will be cleared`);
    }

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

    // Permanently delete from database (foreign keys will automatically clear references)
    await db.query<ResultSetHeader>('DELETE FROM media WHERE id = ?', [params.id]);

    return NextResponse.json({ 
      success: true,
      cleared_references: totalUsage > 0 ? {
        posts: postCount[0].count,
        terms: termCount[0].count,
        total: totalUsage,
      } : null
    });
  } catch (error) {
    console.error('Error permanently deleting media:', error);
    return NextResponse.json({ error: 'Failed to permanently delete media' }, { status: 500 });
  }
}

