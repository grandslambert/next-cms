import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDate, truncate } from '@/lib/utils';
import { getImageUrl } from '@/lib/image-utils';
import { getPostByFullPath } from '@/lib/post-utils';
import { buildPostUrls } from '@/lib/post-url-builder';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// Helper function to check and get taxonomy
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

// Helper function to get taxonomy terms
async function getTerms(taxonomyId: number) {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT t.*, COUNT(tr.post_id) as post_count,
              parent.name as parent_name, parent.slug as parent_slug
       FROM terms t
       LEFT JOIN term_relationships tr ON t.id = tr.term_id
       LEFT JOIN posts p ON tr.post_id = p.id AND p.status = 'published'
       LEFT JOIN terms parent ON t.parent_id = parent.id
       WHERE t.taxonomy_id = ?
       GROUP BY t.id
       ORDER BY t.parent_id ASC, t.name ASC`,
      [taxonomyId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching terms:', error);
    return [];
  }
}

// Helper function to get a specific term
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

// Helper function to get posts by term
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

// Helper function to build term hierarchy
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

// Helper function to organize terms hierarchically
function organizeHierarchically(terms: any[]) {
  const termMap = new Map();
  const rootTerms: any[] = [];

  terms.forEach((term: any) => {
    termMap.set(term.id, { ...term, children: [] });
  });

  terms.forEach((term: any) => {
    const termWithChildren = termMap.get(term.id);
    if (term.parent_id && termMap.has(term.parent_id)) {
      const parent = termMap.get(term.parent_id);
      parent.children.push(termWithChildren);
    } else {
      rootTerms.push(termWithChildren);
    }
  });

  return rootTerms;
}

// Component to render a term card recursively
function TermCard({ term, taxonomySlug, level = 0 }: { term: any; taxonomySlug: string; level?: number }) {
  return (
    <>
      <Link
        href={`/${taxonomySlug}/${term.slug}`}
        className={`bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow ${level > 0 ? 'ml-8 border-l-4 border-primary-200' : ''}`}
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {level > 0 && <span className="text-primary-600 mr-2">↳</span>}
          {term.name}
        </h2>
        {term.description && (
          <p className="text-gray-600 text-sm mb-3">{term.description}</p>
        )}
        <div className="text-sm text-primary-600 font-medium">
          {term.post_count} {term.post_count === 1 ? 'post' : 'posts'}
        </div>
      </Link>
      {term.children && term.children.length > 0 && (
        <div className="space-y-4">
          {term.children.map((child: any) => (
            <TermCard key={child.id} term={child} taxonomySlug={taxonomySlug} level={level + 1} />
          ))}
        </div>
      )}
    </>
  );
}

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

export default async function UnifiedCatchAll({ params }: { params: { slug: string[] } }) {
  const segments = params.slug;

  // Check if this is a taxonomy archive page (single segment)
  if (segments.length === 1) {
    const taxonomy = await getTaxonomy(segments[0]);
    
    if (taxonomy) {
      const terms = await getTerms(taxonomy.id);
      const organizedTerms = taxonomy.hierarchical 
        ? organizeHierarchically(terms)
        : terms;

      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{taxonomy.label}</h1>
            {taxonomy.description && (
              <p className="text-xl text-gray-600">{taxonomy.description}</p>
            )}
          </div>

          {terms.length > 0 ? (
            taxonomy.hierarchical ? (
              <div className="space-y-4">
                {organizedTerms.map((term: any) => (
                  <TermCard key={term.id} term={term} taxonomySlug={segments[0]} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {terms.map((term: any) => (
                  <Link
                    key={term.id}
                    href={`/${segments[0]}/${term.slug}`}
                    className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                  >
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">{term.name}</h2>
                    {term.description && (
                      <p className="text-gray-600 text-sm mb-3">{term.description}</p>
                    )}
                    <div className="text-sm text-primary-600 font-medium">
                      {term.post_count} {term.post_count === 1 ? 'post' : 'posts'}
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏷️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No terms yet</h3>
              <p className="text-gray-600">No {taxonomy.label.toLowerCase()} have been created.</p>
            </div>
          )}
        </div>
      );
    }
  }

  // Check if this is a taxonomy term page (two segments)
  if (segments.length === 2) {
    const taxonomy = await getTaxonomy(segments[0]);
    
    if (taxonomy) {
      const term = await getTerm(taxonomy.id, segments[1]);
      
      if (term) {
        const posts = await getPostsByTerm(term.id);
        const hierarchy = taxonomy.hierarchical 
          ? await getTermHierarchy(term.id)
          : [term];
        const postsWithUrls = await buildPostUrls(posts);

        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-8">
              <nav className="text-sm text-gray-500 mb-4 flex items-center flex-wrap">
                <Link href={`/${segments[0]}`} className="hover:text-primary-600">
                  {taxonomy.label}
                </Link>
                {taxonomy.hierarchical && hierarchy.length > 1 ? (
                  <>
                    {hierarchy.slice(0, -1).map((ancestorTerm: any) => (
                      <span key={ancestorTerm.id} className="flex items-center">
                        <span className="mx-2">/</span>
                        <Link 
                          href={`/${segments[0]}/${ancestorTerm.slug}`}
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
    }
  }

  // If not a taxonomy/term, try to find a post/page
  const post = await getPostBySlug(segments);

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
