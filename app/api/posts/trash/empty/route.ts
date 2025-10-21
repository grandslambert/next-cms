import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels } from '@/lib/model-factory';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = (session.user as any).permissions || {};
    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId;
    
    if (!permissions.can_delete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    const body = await request.json();
    const { post_type } = body;

    if (!post_type) {
      return NextResponse.json({ error: 'post_type is required' }, { status: 400 });
    }

    const Post = await SiteModels.Post(siteId);
    const PostTerm = await SiteModels.PostTerm(siteId);
    const PostMeta = await SiteModels.PostMeta(siteId);
    const PostRevision = await SiteModels.PostRevision(siteId);

    // Find all posts in trash for this post type
    const trashedPosts = await Post.find({
      post_type,
      status: 'trash',
    }).lean();

    if (trashedPosts.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const postIds = (trashedPosts as any[]).map((p) => p._id);

    // Delete related data
    await PostTerm.deleteMany({ post_id: { $in: postIds } });
    await PostMeta.deleteMany({ post_id: { $in: postIds } });
    await PostRevision.deleteMany({ post_id: { $in: postIds } });

    // Delete posts
    const result = await Post.deleteMany({ _id: { $in: postIds } });

    // Log activity
    await logActivity({
      userId,
      action: 'posts_emptied_trash' as any,
      entityType: 'post' as any,
      entityId: 'multiple',
      entityName: 'Multiple posts',
      details: `Permanently deleted ${result.deletedCount} ${post_type}(s) from trash`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    console.error('Error emptying trash:', error);
    return NextResponse.json({ error: 'Failed to empty trash' }, { status: 500 });
  }
}
