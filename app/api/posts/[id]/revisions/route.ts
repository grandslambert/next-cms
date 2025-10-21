import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels, GlobalModels } from '@/lib/model-factory';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    const siteId = (session.user as any).currentSiteId;
    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    const PostRevision = await SiteModels.PostRevision(siteId);
    const User = await GlobalModels.User();

    const revisions = await PostRevision.find({ post_id: new mongoose.Types.ObjectId(params.id) })
      .sort({ created_at: -1 })
      .lean();

    // Get author names
    const authorIds = [...new Set((revisions as any[]).map((r: any) => r.author_id?.toString()).filter(Boolean))];
    const authors = await User.find({ _id: { $in: authorIds } }).select('_id username email').lean();
    const authorMap = new Map((authors as any[]).map((a: any) => [a._id.toString(), a.username || a.email]));

    // Format for UI compatibility
    const formattedRevisions = (revisions as any[]).map((rev) => ({
      ...rev,
      id: rev._id.toString(),
      author_name: authorMap.get(rev.author_id?.toString()) || 'Unknown',
    }));

    return NextResponse.json({ revisions: formattedRevisions });
  } catch (error) {
    console.error('Error fetching post revisions:', error);
    return NextResponse.json({ error: 'Failed to fetch post revisions' }, { status: 500 });
  }
}
