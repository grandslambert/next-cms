import Link from 'next/link';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { notFound } from 'next/navigation';
import { formatDate, truncate } from '@/lib/utils';
import { getImageUrl } from '@/lib/image-utils';
import { buildPostUrls } from '@/lib/post-url-builder';

async function getTaxonomy(taxonomySlug: string) {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM taxonomies WHERE name = ?',
      [taxonomySlug]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching taxonomy:', error);
    return null;
  }
}

async function getTerm(taxonomyId: number, termSlug: string) {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM terms WHERE taxonomy_id = ? AND slug = ?',
      [taxonomyId, termSlug]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching term:', error);
    return null;
  }
}

// Helper function to build term hierarchy breadcrumb
async function getTermHierarchy(termId: number): Promise<any[]> {
  const hierarchy: any[] = [];
  let currentId: number | null = termId;

  while (currentId) {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id, name, slug, parent_id FROM terms WHERE id = ?',
      [currentId]
    );

    if (!rows.length) break;

    const term = rows[0] as any;
    hierarchy.unshift(term);
    currentId = term.parent_id;
  }

  return hierarchy;
}

async function getPostsByTerm(termId: number) {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as author_name,
              m.url as featured_image, m.sizes as featured_image_sizes,
              pt.url_structure, pt.hierarchical, pt.slug as post_type_slug
       FROM term_relationships tr
       JOIN posts p ON tr.post_id = p.id
       LEFT JOIN users u ON p.author_id = u.id
       LEFT JOIN media m ON p.featured_image_id = m.id
       LEFT JOIN post_types pt ON p.post_type = pt.name
       WHERE tr.term_id = ? AND p.status = 'published'
       ORDER BY p.published_at DESC`,
      [termId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}


export default async function TermPage({
  params,
}: {
  params: { taxonomy: string; term: string };
}) {
  const taxonomy = await getTaxonomy(params.taxonomy);

  if (!taxonomy) {
    notFound();
  }

  const term = await getTerm(taxonomy.id, params.term);

  if (!term) {
    notFound();
  }

  const posts = await getPostsByTerm(term.id);
  
  // Get full hierarchy for breadcrumbs if hierarchical
  const hierarchy = taxonomy.hierarchical 
    ? await getTermHierarchy(term.id)
    : [term];

  // Build URLs for all posts using the centralized function
  const postsWithUrls = await buildPostUrls(posts);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <nav className="text-sm text-gray-500 mb-4 flex items-center flex-wrap">
          <Link href={`/${params.taxonomy}`} className="hover:text-primary-600">
            {taxonomy.label}
          </Link>
          {taxonomy.hierarchical && hierarchy.length > 1 ? (
            <>
              {hierarchy.slice(0, -1).map((ancestorTerm: any) => (
                <span key={ancestorTerm.id} className="flex items-center">
                  <span className="mx-2">/</span>
                  <Link 
                    href={`/${params.taxonomy}/${ancestorTerm.slug}`}
                    className="hover:text-primary-600"
                  >
                    {ancestorTerm.name}
                  </Link>
                </span>
              ))}
              <span className="mx-2">/</span>
              <span className="text-gray-900">{term.name}</span>
            </>
          ) : (
            <>
              <span className="mx-2">/</span>
              <span className="text-gray-900">{term.name}</span>
            </>
          )}
        </nav>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{term.name}</h1>
        {term.description && (
          <p className="text-xl text-gray-600">{term.description}</p>
        )}
      </div>

      {postsWithUrls.length > 0 ? (
        <div className="space-y-8">
          {postsWithUrls.map((post: any) => (
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
                    <Link href={post.url} className="hover:text-primary-600">
                      {post.title}
                    </Link>
                  </h2>
                  {post.excerpt && (
                    <p className="text-gray-600 mb-4">
                      {truncate(post.excerpt, 200)}
                    </p>
                  )}
                  <Link
                    href={post.url}
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
          <p className="text-gray-600">No posts have been tagged with {term.name}.</p>
        </div>
      )}
    </div>
  );
}

