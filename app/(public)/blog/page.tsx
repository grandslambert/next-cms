import Link from 'next/link';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { formatDate, truncate } from '@/lib/utils';
import { getImageUrl } from '@/lib/image-utils';

async function getPosts() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as author_name,
              m.url as featured_image, m.sizes as featured_image_sizes
       FROM posts p 
       LEFT JOIN users u ON p.author_id = u.id
       LEFT JOIN media m ON p.featured_image_id = m.id
       WHERE p.status = 'published'
       ORDER BY p.published_at DESC`
    );
    return rows;
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Blog</h1>
        <p className="text-xl text-gray-600">
          Explore our latest articles and insights
        </p>
      </div>

      {posts.length > 0 ? (
        <div className="space-y-8">
          {posts.map((post: any) => (
            <article key={post.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="md:flex">
                {post.featured_image && (
                  <div className="md:w-1/3">
                    <div className="aspect-video md:aspect-square bg-gray-200">
                      <img
                        src={getImageUrl(post.featured_image, post.featured_image_sizes, 'medium')}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                <div className={`p-6 ${post.featured_image ? 'md:w-2/3' : 'w-full'}`}>
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <span>{formatDate(post.published_at)}</span>
                    <span className="mx-2">•</span>
                    <span>By {post.author_name}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    <Link href={`/blog/${post.slug}`} className="hover:text-primary-600">
                      {post.title}
                    </Link>
                  </h2>
                  {post.excerpt && (
                    <p className="text-gray-600 mb-4">
                      {truncate(post.excerpt, 200)}
                    </p>
                  )}
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    Read More →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts yet</h3>
          <p className="text-gray-600">Check back soon for new content!</p>
        </div>
      )}
    </div>
  );
}

