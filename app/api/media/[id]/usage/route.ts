import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels } from '@/lib/model-factory';
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

    const siteId = (session.user as any).currentSiteId;

    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
    }

    const Post = await SiteModels.Post(siteId);

    // Find posts using this media as featured image
    const posts = await Post.find({
      featured_image_id: new mongoose.Types.ObjectId(params.id),
    })
      .select('_id title post_type')
      .lean();

    const formattedPosts = (posts as any[]).map((p: any) => ({
      ...p,
      id: p._id.toString(),
    }));

    return NextResponse.json({ usage: formattedPosts, count: formattedPosts.length });
  } catch (error) {
    console.error('Error fetching media usage:', error);
    return NextResponse.json({ error: 'Failed to fetch media usage' }, { status: 500 });
  }
}
