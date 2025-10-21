import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels } from '@/lib/model-factory';
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
    const PostTerm = await SiteModels.PostTerm(siteId);

    // Check if post exists and get author
    const existingPost = await Post.findById(params.id);

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if ((existingPost as any).status !== 'trash') {
      return NextResponse.json({ error: 'Post must be in trash before permanent deletion' }, { status: 400 });
    }

    const isOwner = (existingPost as any).author_id?.toString() === userId;
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
      userId,
      action: 'post_deleted',
      entityType: 'post',
      entityId: params.id,
      entityName: (existingPost as any).title,
      details: `Permanently deleted ${(existingPost as any).post_type}: "${(existingPost as any).title}"`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    // Delete all related data first (cascading delete)
    await PostTerm.deleteMany({ post_id: params.id });
    
    // Permanently delete the post from database
    await Post.findByIdAndDelete(params.id);

    return NextResponse.json({ success: true, message: 'Post permanently deleted' });
  } catch (error) {
    console.error('Error permanently deleting post:', error);
    return NextResponse.json({ error: 'Failed to permanently delete post' }, { status: 500 });
  }
}
