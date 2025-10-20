import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { Post, PostType, Taxonomy, Term } from '@/lib/models';
import { getDefaultSite } from '@/lib/url-utils';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import mongoose from 'mongoose';

async function getContent(slugPath: string[]) {
  try {
    const site = await getDefaultSite();
    if (!site) return null;

    await connectDB();

    const slug = slugPath[slugPath.length - 1];
    const firstSegment = slugPath[0];

    // Check if it's a taxonomy archive
    const taxonomy = await Taxonomy.findOne({
      site_id: new mongoose.Types.ObjectId(site.id),
      slug: firstSegment,
    }).lean();

    if (taxonomy && slugPath.length === 2) {
      // It's a term archive
      const term = await Term.findOne({
        taxonomy_id: taxonomy._id,
        slug: slugPath[1],
      }).lean();

      if (term) {
        return { type: 'term', data: { term, taxonomy } };
      }
    }

    if (taxonomy && slugPath.length === 1) {
      return { type: 'taxonomy', data: taxonomy };
    }

    // Check if it's a page
    const page = await Post.findOne({
      site_id: new mongoose.Types.ObjectId(site.id),
      post_type: 'page',
      slug,
      status: 'published',
    })
      .populate('author_id', 'username email')
      .populate('featured_image_id')
      .lean();

    if (page) {
      const featuredImage = page.featured_image_id as any;
      return {
        type: 'page',
        data: {
          ...page,
          id: page._id.toString(),
          author_name: (page.author_id as any)?.username || 'Unknown',
          featured_image: featuredImage?.filepath || null,
        },
      };
    }

    // Check if it's a custom post type
    const postType = await PostType.findOne({
      site_id: new mongoose.Types.ObjectId(site.id),
      slug: firstSegment,
    }).lean();

    if (postType && slugPath.length > 1) {
      const post = await Post.findOne({
        site_id: new mongoose.Types.ObjectId(site.id),
        post_type: postType.name,
        slug,
        status: 'published',
      })
        .populate('author_id', 'username email')
        .populate('featured_image_id')
        .lean();

      if (post) {
        const featuredImage = post.featured_image_id as any;
        return {
          type: 'post',
          data: {
            ...post,
            id: post._id.toString(),
            author_name: (post.author_id as any)?.username || 'Unknown',
            featured_image: featuredImage?.filepath || null,
          },
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching content:', error);
    return null;
  }
}

export default async function SlugPage({ params }: { params: { slug: string[] } }) {
  const content = await getContent(params.slug);

  if (!content) {
    notFound();
  }

  if (content.type === 'page' || content.type === 'post') {
    const post = content.data as any;
    
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

  if (content.type === 'taxonomy') {
    const taxonomy = content.data as any;
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">{taxonomy.label}</h1>
        <p className="text-gray-600">Taxonomy archive page (implementation pending)</p>
      </div>
    );
  }

  if (content.type === 'term') {
    const { term, taxonomy } = content.data as any;
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{term.name}</h1>
        <p className="text-gray-600 mb-8">in {taxonomy.label}</p>
        <p className="text-gray-600">Term archive page (implementation pending)</p>
      </div>
    );
  }

  notFound();
}
