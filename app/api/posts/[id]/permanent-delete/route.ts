import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
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
      return NextResponse.json({ error: 'Post must be in trash before permanent deletion' }, { status: 400 });
    }

    const isOwner = post.author_id === parseInt(userId);
    const canDelete = permissions.can_delete === true;
    const canDeleteOthers = permissions.can_delete_others === true;

    // Check if user can delete this post
    if (isOwner && !canDelete) {
      return NextResponse.json({ error: 'You do not have permission to delete posts' }, { status: 403 });
    }
    
    if (!isOwner && !canDeleteOthers) {
      return NextResponse.json({ error: 'You do not have permission to delete others\' posts' }, { status: 403 });
    }

    // Permanently delete the post from database
    await db.query<ResultSetHeader>('DELETE FROM posts WHERE id = ?', [params.id]);

    return NextResponse.json({ success: true, message: 'Post permanently deleted' });
  } catch (error) {
    console.error('Error permanently deleting post:', error);
    return NextResponse.json({ error: 'Failed to permanently delete post' }, { status: 500 });
  }
}

