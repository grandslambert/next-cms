import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { Post, PostRevision } from '@/lib/models';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; revisionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId;

    if (!mongoose.Types.ObjectId.isValid(params.id) || !mongoose.Types.ObjectId.isValid(params.revisionId)) {
      return NextResponse.json({ error: 'Invalid post or revision ID' }, { status: 400 });
    }

    await connectDB();

    const revision = await PostRevision.findById(params.revisionId).lean();

    if (!revision) {
      return NextResponse.json({ error: 'Revision not found' }, { status: 404 });
    }

    // Update post with revision data
    const updatedPost = await Post.findByIdAndUpdate(
      params.id,
      {
        title: revision.title,
        content: revision.content,
        excerpt: revision.excerpt,
      },
      { new: true }
    );

    if (!updatedPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Log activity
    await logActivity({
      userId,
      action: 'post_revision_restored' as any,
      entityType: 'post' as any,
      entityId: params.id,
      entityName: updatedPost.title,
      details: `Restored post from revision ${params.revisionId}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ 
      success: true,
      post: {
        ...updatedPost.toObject(),
        id: updatedPost._id.toString(),
      }
    });
  } catch (error) {
    console.error('Error restoring revision:', error);
    return NextResponse.json({ error: 'Failed to restore revision' }, { status: 500 });
  }
}
