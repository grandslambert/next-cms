import { notFound } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { getImageUrl } from '@/lib/image-utils';
import { getPostByFullPath } from '@/lib/post-utils';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

async function getPostBySlug(segments: string[]) {
  try {
    // Determine if first segment is a post type slug
    const [postTypes] = await db.query<RowDataPacket[]>(
      'SELECT name, slug, url_structure FROM post_types WHERE slug != ""'
    );
    
    const postTypeMap = new Map(postTypes.map((pt: any) => [pt.slug, { name: pt.name, structure: pt.url_structure }]));
    
    let postTypeSlug = '';
    let remainingSegments = [...segments];
    
    // Check if first segment is a post type slug
    if (segments.length > 1 && postTypeMap.has(segments[0])) {
      postTypeSlug = segments[0];
      remainingSegments = segments.slice(1);
    }
    
    // Parse date components
    let year, month, day;
    let slugSegments = [...remainingSegments];
    
    // Remove date components from the start if present
    if (slugSegments.length > 0 && /^\d{4}$/.test(slugSegments[0])) {
      year = slugSegments[0];
      slugSegments = slugSegments.slice(1);
      
      if (slugSegments.length > 0 && /^\d{1,2}$/.test(slugSegments[0])) {
        month = slugSegments[0];
        slugSegments = slugSegments.slice(1);
        
        if (slugSegments.length > 0 && /^\d{1,2}$/.test(slugSegments[0])) {
          day = slugSegments[0];
          slugSegments = slugSegments.slice(1);
        }
      }
    }
    
    // Remaining segments are the hierarchical slug path
    if (slugSegments.length === 0) {
      return null;
    }
    
    // Use the helper function to get post by full path
    return await getPostByFullPath(slugSegments, postTypeSlug, year, month, day);
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

export default async function UnifiedPostView({ params }: { params: { slug: string[] } }) {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          {post.title}
        </h1>
        <div className="flex items-center text-gray-600 mb-6">
          <span>{formatDate(post.published_at || post.created_at)}</span>
          {post.author_name && (
            <>
              <span className="mx-2">•</span>
              <span>By {post.author_name}</span>
            </>
          )}
        </div>
        {post.featured_image && (
          <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden mb-6">
            <img
              src={getImageUrl(post.featured_image, post.featured_image_sizes, 'large')}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </header>

      <div 
        className="content-body prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}

