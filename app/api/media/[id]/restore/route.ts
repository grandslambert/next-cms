import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function POST(
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

    // Get media info before restoring
    const [mediaRows] = await db.query<RowDataPacket[]>(
      'SELECT original_name, filename FROM media WHERE id = ?',
      [params.id]
    );

    // Restore from trash
    await db.execute<ResultSetHeader>(
      'UPDATE media SET deleted_at = NULL WHERE id = ?',
      [params.id]
    );

    // Log activity
    const userId = (session.user as any).id;
    if (mediaRows.length > 0) {
      await logActivity({
        userId,
        action: 'media_restored',
        entityType: 'media',
        entityId: Number.parseInt(params.id),
        entityName: mediaRows[0].original_name || mediaRows[0].filename,
        details: `Restored media from trash: ${mediaRows[0].original_name || mediaRows[0].filename}`,
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      });
    }

    return NextResponse.json({ message: 'Media restored successfully' });
  } catch (error) {
    console.error('Error restoring media:', error);
    return NextResponse.json({ error: 'Failed to restore media' }, { status: 500 });
  }
}

