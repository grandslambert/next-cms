import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels } from '@/lib/model-factory';
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

    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(params.id)) {
      return NextResponse.json({ error: 'Invalid post ID format' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const permissions = (session.user as any).permissions || {};
    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    const siteId = (session.user as any).currentSiteId;

    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    const Post = await SiteModels.Post(siteId);

    // Check if post exists and get author
    const existingPost = await Post.findById(params.id);

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if ((existingPost as any).status !== 'trash') {
      return NextResponse.json({ error: 'Post is not in trash' }, { status: 400 });
    }

    const isOwner = (existingPost as any).author_id?.toString() === userId;
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
    await Post.findByIdAndUpdate(
      params.id,
      { $set: { status: 'draft' } }
    );

    // Log activity
    await logActivity({
      userId,
      action: 'post_restored',
      entityType: 'post',
      siteId,
      entityId: params.id,
      entityName: (existingPost as any).title,
      details: `Restored ${(existingPost as any).post_type} from trash: "${(existingPost as any).title}"`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ success: true, message: 'Post restored from trash' });
  } catch (error) {
    console.error('Error restoring post:', error);
    return NextResponse.json({ error: 'Failed to restore post' }, { status: 500 });
  }
}
