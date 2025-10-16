import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

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

    // Restore from trash
    await db.execute<ResultSetHeader>(
      'UPDATE media SET deleted_at = NULL WHERE id = ?',
      [params.id]
    );

    return NextResponse.json({ message: 'Media restored successfully' });
  } catch (error) {
    console.error('Error restoring media:', error);
    return NextResponse.json({ error: 'Failed to restore media' }, { status: 500 });
  }
}

