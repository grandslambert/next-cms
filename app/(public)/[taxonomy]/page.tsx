import Link from 'next/link';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { notFound } from 'next/navigation';

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

// Helper function to organize terms hierarchically
function organizeHierarchically(terms: any[]) {
  const termMap = new Map();
  const rootTerms: any[] = [];

  // First pass: create map of all terms
  terms.forEach((term: any) => {
    termMap.set(term.id, { ...term, children: [] });
  });

  // Second pass: organize hierarchy
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

// Component to render a term and its children recursively
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

export default async function TaxonomyArchivePage({
  params,
}: {
  params: { taxonomy: string };
}) {
  const taxonomy = await getTaxonomy(params.taxonomy);

  if (!taxonomy) {
    notFound();
  }

  const terms = await getTerms(taxonomy.id);
  
  // Organize hierarchically if the taxonomy is hierarchical
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
              <TermCard key={term.id} term={term} taxonomySlug={params.taxonomy} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {terms.map((term: any) => (
              <Link
                key={term.id}
                href={`/${params.taxonomy}/${term.slug}`}
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

