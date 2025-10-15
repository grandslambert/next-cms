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

    // Get media info
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM media WHERE id = ?',
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    const media = rows[0];

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

    // Delete from database
    await db.query<ResultSetHeader>('DELETE FROM media WHERE id = ?', [params.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 });
  }
}

