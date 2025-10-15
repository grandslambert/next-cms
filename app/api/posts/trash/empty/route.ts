import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const permissions = (session.user as any).permissions || {};

    const canDelete = permissions.can_delete === true;
    const canDeleteOthers = permissions.can_delete_others === true;

    if (!canDelete) {
      return NextResponse.json({ error: 'You do not have permission to empty trash' }, { status: 403 });
    }

    // If user can only delete their own posts, only empty their own trash
    // If user can delete others' posts, empty all trash
    let query = 'DELETE FROM posts WHERE status = ?';
    let params: any[] = ['trash'];

    if (!canDeleteOthers) {
      query += ' AND author_id = ?';
      params.push(userId);
    }

    const [result] = await db.query<ResultSetHeader>(query, params);

    return NextResponse.json({ 
      success: true, 
      message: 'Trash emptied successfully',
      deleted_count: result.affectedRows
    });
  } catch (error) {
    console.error('Error emptying trash:', error);
    return NextResponse.json({ error: 'Failed to empty trash' }, { status: 500 });
  }
}

