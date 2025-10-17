import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

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
    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    const siteId = (session.user as any).currentSiteId || 1;
    
    // Get site-prefixed table names
    const postsTable = getSiteTable(siteId, 'posts');
    const postMetaTable = getSiteTable(siteId, 'post_meta');
    const postRevisionsTable = getSiteTable(siteId, 'post_revisions');
    const termRelationshipsTable = getSiteTable(siteId, 'term_relationships');

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
      return NextResponse.json({ error: 'Post must be in trash before permanent deletion' }, { status: 400 });
    }

    const isOwner = post.author_id === Number.parseInt(userId);
    const canDelete = isSuperAdmin || permissions.can_delete === true;
    const canDeleteOthers = isSuperAdmin || permissions.can_delete_others === true;

    // Check if user can delete this post
    if (isOwner && !canDelete) {
      return NextResponse.json({ error: 'You do not have permission to delete posts' }, { status: 403 });
    }
    
    if (!isOwner && !canDeleteOthers) {
      return NextResponse.json({ error: 'You do not have permission to delete others\' posts' }, { status: 403 });
    }

    // Log activity before deleting
    await logActivity({
      userId: Number.parseInt(userId),
      action: 'post_deleted',
      entityType: 'post',
      entityId: Number.parseInt(params.id),
      entityName: post.title,
      details: `Permanently deleted ${post.post_type}: "${post.title}"`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    // Delete all related data first (cascading delete)
    await db.query<ResultSetHeader>(`DELETE FROM ${postMetaTable} WHERE post_id = ?`, [params.id]);
    await db.query<ResultSetHeader>(`DELETE FROM ${postRevisionsTable} WHERE post_id = ?`, [params.id]);
    await db.query<ResultSetHeader>(`DELETE FROM ${termRelationshipsTable} WHERE post_id = ?`, [params.id]);
    
    // Permanently delete the post from database
    await db.query<ResultSetHeader>(`DELETE FROM ${postsTable} WHERE id = ?`, [params.id]);

    return NextResponse.json({ success: true, message: 'Post permanently deleted' });
  } catch (error) {
    console.error('Error permanently deleting post:', error);
    return NextResponse.json({ error: 'Failed to permanently delete post' }, { status: 500 });
  }
}

