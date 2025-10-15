import { notFound } from 'next/navigation';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { formatDate } from '@/lib/utils';
import { getImageUrl } from '@/lib/image-utils';

async function getPost(slug: string) {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as author_name,
              m.url as featured_image, m.sizes as featured_image_sizes
       FROM posts p 
       LEFT JOIN users u ON p.author_id = u.id
       LEFT JOIN media m ON p.featured_image_id = m.id
       WHERE p.slug = ? AND p.status = 'published'`,
      [slug]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);

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

