import Link from 'next/link';
import { connectDB } from '@/lib/db';
import { Post } from '@/lib/models';
import { getDefaultSite } from '@/lib/url-utils';
import { formatDate, truncate } from '@/lib/utils';
import { buildPostUrl } from '@/lib/post-url-builder';
import mongoose from 'mongoose';

async function getBlogPosts() {
  try {
    const site = await getDefaultSite();
    if (!site) return [];

    await connectDB();
    
    const posts = await Post.find({
      site_id: new mongoose.Types.ObjectId(site.id),
      post_type: 'post',
      status: 'published',
    })
      .sort({ published_at: -1 })
      .populate('author_id', 'username email')
      .populate('featured_image_id')
      .lean();

    const postsWithUrls = await Promise.all(posts.map(async (post) => {
      const url = await buildPostUrl(post._id.toString(), site.id);
      const featuredImage = post.featured_image_id as any;
      
      return {
        ...post,
        id: post._id.toString(),
        author_name: (post.author_id as any)?.username || 'Unknown',
        featured_image: featuredImage?.filepath || null,
        url,
      };
    }));

    return postsWithUrls;
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }
}

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Blog</h1>
      
      {posts.length === 0 ? (
        <p className="text-gray-600">No blog posts yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post: any) => (
            <article key={post.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {post.featured_image && (
                <div className="aspect-video overflow-hidden">
                  <img
                    src={post.featured_image}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-2">
                  <Link href={post.url} className="hover:text-primary-600 transition-colors">
                    {post.title}
                  </Link>
                </h2>
                <p className="text-gray-600 mb-4">
                  {truncate(post.excerpt || '', 120)}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{post.author_name}</span>
                  <time>{formatDate(post.published_at)}</time>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
