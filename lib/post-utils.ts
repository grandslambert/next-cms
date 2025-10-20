import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// Build full slug path including parent slugs for hierarchical posts
export async function buildSlugPath(postId: number | string, siteId: number = 1): Promise<string> {
  try {
    const path: string[] = [];
    let currentId: number | string | null = postId;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops
    const postsTable = getSiteTable(siteId, 'posts');
    
    while (currentId && iterations < maxIterations) {
      const result: [RowDataPacket[], any] = await db.query<RowDataPacket[]>(
        `SELECT slug, parent_id FROM ${postsTable} WHERE id = ?`,
        [currentId]
      ) as any;
      const rows = result[0];
      
      if (rows.length === 0) break;
      
      path.unshift(rows[0].slug);
      currentId = rows[0].parent_id;
      iterations++;
    }
    
    return path.join('/');
  } catch (error) {
    console.error('Error building slug path:', error);
    return '';
  }
}

// Get post by full slug path (handles hierarchical slugs)
export async function getPostByFullPath(segments: string[], postTypeSlug: string = '', year?: string, month?: string, day?: string, siteId: number = 1) {
  try {
    const postsTable = getSiteTable(siteId, 'posts');
    const mediaTable = getSiteTable(siteId, 'media');
    const postTypesTable = getSiteTable(siteId, 'post_types');
    
    // The last segment is always the final post slug
    const finalSlug = segments[segments.length - 1];
    
    let query = `SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as author_name,
            m.url as featured_image, m.sizes as featured_image_sizes
     FROM ${postsTable} p 
     LEFT JOIN users u ON p.author_id = u.id
     LEFT JOIN ${mediaTable} m ON p.featured_image_id = m.id
     LEFT JOIN ${postTypesTable} pt ON p.post_type = pt.name
     WHERE p.slug = ? 
       AND p.status = 'published'`;
    
    const params: any[] = [finalSlug];
    
    if (postTypeSlug) {
      query += ' AND pt.slug = ?';
      params.push(postTypeSlug);
    } else {
      query += ' AND (pt.slug = "" OR pt.slug IS NULL)';
    }
    
    if (year) {
      query += ' AND YEAR(p.published_at) = ?';
      params.push(year);
    }
    
    if (month) {
      query += ' AND MONTH(p.published_at) = ?';
      params.push(month);
    }
    
    if (day) {
      query += ' AND DAY(p.published_at) = ?';
      params.push(day);
    }
    
    const [rows] = await db.query<RowDataPacket[]>(query, params);
    
    if (rows.length === 0) return null;
    
    const post = rows[0];
    
    // For hierarchical types, verify the full path matches
    const [postType] = await db.query<RowDataPacket[]>(
      'SELECT hierarchical FROM post_types WHERE name = ?',
      [post.post_type]
    );
    
    if (postType[0]?.hierarchical) {
      const fullPath = await buildSlugPath(post.id);
      const expectedPath = segments.join('/');
      
      // For date-based URLs, remove date parts from comparison
      let segmentsWithoutDates = [...segments];
      if (year) {
        segmentsWithoutDates = segmentsWithoutDates.filter(s => 
          s !== year && s !== month && s !== day
        );
      }
      
      if (fullPath !== segmentsWithoutDates.join('/')) {
        return null; // Path doesn't match hierarchy
      }
    }
    
    return post;
  } catch (error) {
    console.error('Error fetching post by path:', error);
    return null;
  }
}

