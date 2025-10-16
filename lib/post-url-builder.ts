import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// Helper function to build hierarchical slug path
async function buildHierarchicalSlugPath(postId: number): Promise<string> {
  const slugs: string[] = [];
  let currentId: number | null = postId;

  while (currentId) {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT slug, parent_id FROM posts WHERE id = ?',
      [currentId]
    );

    if (!rows.length) break;

    const post = rows[0] as any;
    slugs.unshift(post.slug);
    currentId = post.parent_id;
  }

  return slugs.join('/');
}

/**
 * Build the correct URL for a post based on its post type's URL structure
 * @param post - Post object with url_structure, hierarchical, published_at, slug, post_type_slug
 * @returns The properly formatted URL
 */
export async function buildPostUrl(post: any): Promise<string> {
  const urlStructure = post.url_structure || 'default';
  const isHierarchical = post.hierarchical === 1 || post.hierarchical === true;
  
  // For hierarchical post types, build the full slug path
  let slug = post.slug;
  if (isHierarchical) {
    slug = await buildHierarchicalSlugPath(post.id);
    // Hierarchical posts always use just the slug path
    return `/${slug}`;
  }
  
  // For non-hierarchical, build URL based on structure
  const publishDate = new Date(post.published_at || post.created_at);
  const year = publishDate.getFullYear();
  const month = String(publishDate.getMonth() + 1).padStart(2, '0');
  const day = String(publishDate.getDate()).padStart(2, '0');
  
  // Get the post type slug (could be 'blog', 'news', etc.)
  const postTypeSlug = post.post_type_slug || post.slug_prefix || post.post_type || 'post';
  
  let url = '';
  
  switch (urlStructure) {
    case 'year':
      url = `/${postTypeSlug}/${year}/${slug}`;
      break;
    case 'year_month':
      url = `/${postTypeSlug}/${year}/${month}/${slug}`;
      break;
    case 'year_month_day':
      url = `/${postTypeSlug}/${year}/${month}/${day}/${slug}`;
      break;
    case 'default':
    default:
      // Default is just /{post_type_slug}/{slug}
      url = `/${postTypeSlug}/${slug}`;
      break;
  }
  
  return url;
}

/**
 * Build URLs for an array of posts
 * @param posts - Array of post objects
 * @returns Array of posts with 'url' property added
 */
export async function buildPostUrls(posts: any[]): Promise<any[]> {
  return await Promise.all(
    posts.map(async (post: any) => ({
      ...post,
      url: await buildPostUrl(post),
    }))
  );
}

