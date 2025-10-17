import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(
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
    const postRevisionsTable = getSiteTable(siteId, 'post_revisions');

    // Check if post exists and user has permission to view it
    const [existingPost] = await db.query<RowDataPacket[]>(
      `SELECT author_id, post_type FROM ${postsTable} WHERE id = ?`,
      [params.id]
    );

    if (existingPost.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = existingPost[0];
    const isOwner = post.author_id === Number.parseInt(userId);
    const canManageOthers = isSuperAdmin || permissions.manage_others_posts === true;

    // Check if user can view this post's revisions
    if (!isOwner && !canManageOthers) {
      return NextResponse.json({ error: 'You can only view revisions of your own posts' }, { status: 403 });
    }

    // Fetch revisions
    const [revisions] = await db.query<RowDataPacket[]>(
      `SELECT r.*, CONCAT(u.first_name, ' ', u.last_name) as author_name
       FROM ${postRevisionsTable} r
       LEFT JOIN users u ON r.author_id = u.id
       WHERE r.post_id = ?
       ORDER BY r.created_at DESC`,
      [params.id]
    );

    return NextResponse.json({ revisions });
  } catch (error) {
    console.error('Error fetching revisions:', error);
    return NextResponse.json({ error: 'Failed to fetch revisions' }, { status: 500 });
  }
}

