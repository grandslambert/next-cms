import { connectDB } from '@/lib/db';
import { Post, PostType } from '@/lib/models';
import mongoose from 'mongoose';

export async function buildPostUrl(postId: string, siteId: string): Promise<string> {
  try {
    if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(siteId)) {
      return '#';
    }

    await connectDB();

    const post = await Post.findById(postId).lean();
    if (!post) {
      return '#';
    }

    const postType = await PostType.findOne({
      site_id: new mongoose.Types.ObjectId(siteId),
      name: post.post_type,
    }).lean();

    // Build hierarchical slug path
    const slugPath: string[] = [post.slug];
    let currentParentId = post.parent_id;
    let iterations = 0;

    while (currentParentId && iterations < 10) {
      const parent = await Post.findById(currentParentId).lean();
      if (!parent) break;
      slugPath.unshift(parent.slug);
      currentParentId = parent.parent_id;
      iterations++;
    }

    // Build URL based on post type structure
    const baseSlug = postType?.slug || post.post_type;
    const basePath = baseSlug ? `/${baseSlug}` : '';

    if (post.published_at && postType?.url_structure && postType.url_structure !== 'default') {
      const date = new Date(post.published_at);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      switch (postType.url_structure) {
        case 'year':
          return `${basePath}/${year}/${slugPath.join('/')}`;
        case 'year_month':
          return `${basePath}/${year}/${month}/${slugPath.join('/')}`;
        case 'year_month_day':
          return `${basePath}/${year}/${month}/${day}/${slugPath.join('/')}`;
      }
    }

    return basePath ? `${basePath}/${slugPath.join('/')}` : `/${slugPath.join('/')}`;
  } catch (error) {
    console.error('Error building post URL:', error);
    return '#';
  }
}
