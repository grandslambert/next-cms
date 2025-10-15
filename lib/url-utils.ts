import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// Build full URL path including parent slugs for hierarchical posts
export async function buildPostUrl(post: any, postType: any): Promise<string> {
  try {
    const slugPath: string[] = [];
    let currentId = post.id;
    let iterations = 0;
    const maxIterations = 10;
    
    // Build slug path from bottom to top
    while (currentId && iterations < maxIterations) {
      const [rows] = await db.query<RowDataPacket[]>(
        'SELECT slug, parent_id FROM posts WHERE id = ?',
        [currentId]
      );
      
      if (rows.length === 0) break;
      
      slugPath.unshift(rows[0].slug);
      currentId = rows[0].parent_id;
      iterations++;
    }
    
    // Build URL based on post type structure
    const baseSlug = postType.slug || '';
    const basePath = baseSlug ? `/${baseSlug}` : '';
    
    // Add date components if needed
    if (post.published_at && postType.url_structure !== 'default') {
      const date = new Date(post.published_at);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      switch (postType.url_structure) {
        case 'year':
          return `${basePath}/${year}/${slugPath.join('/')}`;
        case 'year_month':
          return `${basePath}/${year}/${month}/${slugPath.join('/')}`;
        case 'year_month_day':
          return `${basePath}/${year}/${month}/${day}/${slugPath.join('/')}`;
      }
    }
    
    // Default structure
    return basePath ? `${basePath}/${slugPath.join('/')}` : `/${slugPath.join('/')}`;
  } catch (error) {
    console.error('Error building post URL:', error);
    return '/';
  }
}

