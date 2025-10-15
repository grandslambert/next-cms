import { notFound } from 'next/navigation';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { formatDate } from '@/lib/utils';
import { getImageUrl } from '@/lib/image-utils';

async function getPost(slug: string, year?: string, month?: string, day?: string) {
  try {
    // First try to match with date constraints if provided
    if (year) {
      let query = `SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as author_name,
              m.url as featured_image, m.sizes as featured_image_sizes,
              pt.url_structure
       FROM posts p 
       LEFT JOIN users u ON p.author_id = u.id
       LEFT JOIN media m ON p.featured_image_id = m.id
       LEFT JOIN post_types pt ON p.post_type = pt.name
       WHERE p.slug = ? 
         AND p.post_type = 'post'
         AND p.status = 'published'
         AND YEAR(p.published_at) = ?`;
      
      const params: any[] = [slug, year];
      
      if (month) {
        query += ' AND MONTH(p.published_at) = ?';
        params.push(month);
      }
      
      if (day) {
        query += ' AND DAY(p.published_at) = ?';
        params.push(day);
      }
      
      const [rows] = await db.query<RowDataPacket[]>(query, params);
      return rows[0] || null;
    }
    
    // Default: no date in URL
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as author_name,
              m.url as featured_image, m.sizes as featured_image_sizes,
              pt.url_structure
       FROM posts p 
       LEFT JOIN users u ON p.author_id = u.id
       LEFT JOIN media m ON p.featured_image_id = m.id
       LEFT JOIN post_types pt ON p.post_type = pt.name
       WHERE p.slug = ? 
         AND p.post_type = 'post'
         AND pt.url_structure = 'default'
         AND p.status = 'published'`,
      [slug]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

// Catch-all route handles: /blog/slug, /blog/year/slug, /blog/year/month/slug, /blog/year/month/day/slug
export default async function PostPage({ params }: { params: { slug: string[] } }) {
  const slugParam = params.slug;
  
  let year, month, day, slug;
  
  // Parse the URL pattern
  // Possible patterns:
  // [slug] - default
  // [year, slug] - year only
  // [year, month, slug] - year/month
  // [year, month, day, slug] - year/month/day
  
  if (slugParam.length === 4) {
    // year/month/day/slug
    [year, month, day, slug] = slugParam;
  } else if (slugParam.length === 3) {
    // year/month/slug
    [year, month, slug] = slugParam;
  } else if (slugParam.length === 2) {
    // year/slug
    [year, slug] = slugParam;
  } else if (slugParam.length === 1) {
    // Just slug
    slug = slugParam[0];
  } else {
    notFound();
  }

  const post = await getPost(slug, year, month, day);

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
          <span>{formatDate(post.published_at)}</span>
          <span className="mx-2">•</span>
          <span>By {post.author_name}</span>
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

