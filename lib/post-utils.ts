import { connectDB } from '@/lib/db';
import { Post } from '@/lib/models';
import mongoose from 'mongoose';

export async function getPostBySlug(slug: string, postType: string, siteId: string) {
  try {
    if (!siteId || !mongoose.Types.ObjectId.isValid(siteId)) {
      return null;
    }

    await connectDB();

    const post = await Post.findOne({
      site_id: new mongoose.Types.ObjectId(siteId),
      post_type: postType,
      slug,
      status: 'published',
    })
      .populate('author_id', 'username email')
      .populate('featured_image_id')
      .lean();

    if (!post) {
      return null;
    }

    return {
      ...post,
      id: post._id.toString(),
      author_name: (post.author_id as any)?.username || 'Unknown',
    };
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

export async function getRecentPosts(postType: string, siteId: string, limit: number = 10) {
  try {
    if (!siteId || !mongoose.Types.ObjectId.isValid(siteId)) {
      return [];
    }

    await connectDB();

    const posts = await Post.find({
      site_id: new mongoose.Types.ObjectId(siteId),
      post_type: postType,
      status: 'published',
    })
      .sort({ published_at: -1 })
      .limit(limit)
      .populate('author_id', 'username email')
      .populate('featured_image_id')
      .lean();

    return posts.map((post) => ({
      ...post,
      id: post._id.toString(),
      author_name: (post.author_id as any)?.username || 'Unknown',
    }));
  } catch (error) {
    console.error('Error fetching recent posts:', error);
    return [];
  }
}
