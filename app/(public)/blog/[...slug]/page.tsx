import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { Post } from '@/lib/models';
import { getDefaultSite } from '@/lib/url-utils';
import { formatDate } from '@/lib/utils';
import mongoose from 'mongoose';

async function getPost(slug: string) {
  try {
    const site = await getDefaultSite();
    if (!site) return null;

    await connectDB();
    
    const post = await Post.findOne({
      site_id: new mongoose.Types.ObjectId(site.id),
      post_type: 'post',
      slug,
      status: 'published',
    })
      .populate('author_id', 'username email')
      .populate('featured_image_id')
      .lean();

    if (!post) return null;

    const featuredImage = post.featured_image_id as any;
    
    return {
      ...post,
      id: post._id.toString(),
      author_name: (post.author_id as any)?.username || 'Unknown',
      featured_image: featuredImage?.filepath || null,
    };
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

export default async function BlogPostPage({ params }: { params: { slug: string[] } }) {
  const slug = params.slug[params.slug.length - 1];
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {post.featured_image && (
        <div className="aspect-video overflow-hidden rounded-lg mb-8">
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
      
      <div className="flex items-center text-gray-600 mb-8">
        <span>By {post.author_name}</span>
        <span className="mx-2">•</span>
        <time>{formatDate(post.published_at)}</time>
      </div>

      <div 
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
