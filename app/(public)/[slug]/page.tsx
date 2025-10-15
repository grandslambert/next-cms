import { notFound } from 'next/navigation';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { formatDate } from '@/lib/utils';
import { getImageUrl } from '@/lib/image-utils';

async function getPage(slug: string) {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as author_name,
              m.url as featured_image, m.sizes as featured_image_sizes
       FROM posts p 
       LEFT JOIN users u ON p.author_id = u.id
       LEFT JOIN media m ON p.featured_image_id = m.id
       WHERE p.slug = ? AND p.post_type = 'page' AND p.status = 'published'`,
      [slug]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching page:', error);
    return null;
  }
}

export default async function PageView({ params }: { params: { slug: string } }) {
  const page = await getPage(params.slug);

  if (!page) {
    notFound();
  }

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          {page.title}
        </h1>
        {page.featured_image && (
          <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden mb-6">
            <img
              src={getImageUrl(page.featured_image, page.featured_image_sizes, 'large')}
              alt={page.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </header>

      <div 
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </article>
  );
}

