import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db, { getSiteTable } from '@/lib/db';
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

    const userId = (session.user as any).id;
    const permissions = (session.user as any).permissions || {};
    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    const siteId = (session.user as any).currentSiteId || 1;
    
    // Get site-prefixed table name
    const postsTable = getSiteTable(siteId, 'posts');

    // Check if post exists and get author
    const [existingPost] = await db.query<RowDataPacket[]>(
      `SELECT author_id, post_type, status, title FROM ${postsTable} WHERE id = ?`,
      [params.id]
    );

    if (existingPost.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = existingPost[0];

    if (post.status !== 'trash') {
      return NextResponse.json({ error: 'Post is not in trash' }, { status: 400 });
    }

    const isOwner = post.author_id === Number.parseInt(userId);
    const canDelete = isSuperAdmin || permissions.can_delete === true;
    const canDeleteOthers = isSuperAdmin || permissions.can_delete_others === true;

    // Check if user can restore this post (same permissions as delete)
    if (isOwner && !canDelete) {
      return NextResponse.json({ error: 'You do not have permission to restore posts' }, { status: 403 });
    }
    
    if (!isOwner && !canDeleteOthers) {
      return NextResponse.json({ error: 'You do not have permission to restore others\' posts' }, { status: 403 });
    }

    // Restore post to draft status
    await db.query<ResultSetHeader>(
      `UPDATE ${postsTable} SET status = ? WHERE id = ?`,
      ['draft', params.id]
    );

    // Log activity
    await logActivity({
      userId: Number.parseInt(userId),
      action: 'post_restored',
      entityType: 'post',
      siteId,
      entityId: Number.parseInt(params.id),
      entityName: post.title,
      details: `Restored ${post.post_type} from trash: "${post.title}"`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ success: true, message: 'Post restored from trash' });
  } catch (error) {
    console.error('Error restoring post:', error);
    return NextResponse.json({ error: 'Failed to restore post' }, { status: 500 });
  }
}

