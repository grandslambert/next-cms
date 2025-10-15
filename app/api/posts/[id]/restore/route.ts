import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const permissions = (session.user as any).permissions || {};

    // Check if post exists and get author
    const [existingPost] = await db.query<RowDataPacket[]>(
      'SELECT author_id, post_type, status FROM posts WHERE id = ?',
      [params.id]
    );

    if (existingPost.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = existingPost[0];

    if (post.status !== 'trash') {
      return NextResponse.json({ error: 'Post is not in trash' }, { status: 400 });
    }

    const isOwner = post.author_id === parseInt(userId);
    const canDelete = permissions.can_delete === true;
    const canDeleteOthers = permissions.can_delete_others === true;

    // Check if user can restore this post (same permissions as delete)
    if (isOwner && !canDelete) {
      return NextResponse.json({ error: 'You do not have permission to restore posts' }, { status: 403 });
    }
    
    if (!isOwner && !canDeleteOthers) {
      return NextResponse.json({ error: 'You do not have permission to restore others\' posts' }, { status: 403 });
    }

    // Restore post to draft status
    await db.query<ResultSetHeader>(
      'UPDATE posts SET status = ? WHERE id = ?',
      ['draft', params.id]
    );

    return NextResponse.json({ success: true, message: 'Post restored from trash' });
  } catch (error) {
    console.error('Error restoring post:', error);
    return NextResponse.json({ error: 'Failed to restore post' }, { status: 500 });
  }
}

