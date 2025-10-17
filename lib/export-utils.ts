/**
 * Export Utilities
 * Handles different export formats: XML, CSV, SQL
 */

interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: string;
  post_type: string;
  author_id: number;
  featured_image_id?: number;
  parent_id?: number;
  menu_order: number;
  published_at?: Date;
  scheduled_publish_at?: Date;
  created_at: Date;
  updated_at: Date;
  meta?: any[];
}

interface ExportData {
  version: string;
  exported_at: string;
  exported_by: string;
  data: {
    posts?: any[];
    media?: any[];
    media_folders?: any[];
    taxonomies?: {
      taxonomies: any[];
      terms: any[];
      term_relationships: any[];
    };
    menus?: {
      menus: any[];
      menu_items: any[];
      menu_locations: any[];
    };
    postTypes?: {
      post_types: any[];
      post_type_taxonomies: any[];
    };
    settings?: any[];
    users?: {
      users: any[];
      roles: any[];
      user_meta: any[];
    };
  };
}

/**
 * Generate WordPress WXR XML export format
 */
export function generateWordPressXML(data: ExportData, siteUrl: string = 'http://localhost:3000'): string {
  const escapeXml = (unsafe: string): string => {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().replace('T', ' ').substring(0, 19);
  };

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rss version="2.0"\n';
  xml += '  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"\n';
  xml += '  xmlns:content="http://purl.org/rss/1.0/modules/content/"\n';
  xml += '  xmlns:wfw="http://wellformedweb.org/CommentAPI/"\n';
  xml += '  xmlns:dc="http://purl.org/dc/elements/1.1/"\n';
  xml += '  xmlns:wp="http://wordpress.org/export/1.2/"\n';
  xml += '>\n';
  xml += '<channel>\n';
  xml += `  <title>${escapeXml('Next CMS Export')}</title>\n`;
  xml += `  <link>${escapeXml(siteUrl)}</link>\n`;
  xml += `  <description>Next CMS Site Export</description>\n`;
  xml += `  <pubDate>${new Date().toUTCString()}</pubDate>\n`;
  xml += `  <language>en</language>\n`;
  xml += `  <wp:wxr_version>1.2</wp:wxr_version>\n`;
  xml += `  <wp:base_site_url>${escapeXml(siteUrl)}</wp:base_site_url>\n`;
  xml += `  <wp:base_blog_url>${escapeXml(siteUrl)}</wp:base_blog_url>\n`;

  // Export authors
  if (data.data.users?.users) {
    for (const user of data.data.users.users) {
      xml += '  <wp:author>\n';
      xml += `    <wp:author_id>${user.id}</wp:author_id>\n`;
      xml += `    <wp:author_login><![CDATA[${user.username}]]></wp:author_login>\n`;
      xml += `    <wp:author_email><![CDATA[${user.email}]]></wp:author_email>\n`;
      xml += `    <wp:author_display_name><![CDATA[${user.first_name} ${user.last_name}]]></wp:author_display_name>\n`;
      xml += `    <wp:author_first_name><![CDATA[${user.first_name || ''}]]></wp:author_first_name>\n`;
      xml += `    <wp:author_last_name><![CDATA[${user.last_name || ''}]]></wp:author_last_name>\n`;
      xml += '  </wp:author>\n';
    }
  }

  // Export taxonomies
  if (data.data.taxonomies) {
    for (const taxonomy of data.data.taxonomies.taxonomies) {
      xml += '  <wp:taxonomy>\n';
      xml += `    <wp:taxonomy_name><![CDATA[${taxonomy.name}]]></wp:taxonomy_name>\n`;
      xml += `    <wp:taxonomy_slug><![CDATA[${taxonomy.name}]]></wp:taxonomy_slug>\n`;
      xml += '  </wp:taxonomy>\n';
    }

    // Export terms
    for (const term of data.data.taxonomies.terms) {
      const taxonomy = data.data.taxonomies.taxonomies.find((t: any) => t.id === term.taxonomy_id);
      xml += '  <wp:term>\n';
      xml += `    <wp:term_id>${term.id}</wp:term_id>\n`;
      xml += `    <wp:term_taxonomy><![CDATA[${taxonomy?.name || 'category'}]]></wp:term_taxonomy>\n`;
      xml += `    <wp:term_slug><![CDATA[${term.slug}]]></wp:term_slug>\n`;
      xml += `    <wp:term_parent><![CDATA[${term.parent_id || ''}]]></wp:term_parent>\n`;
      xml += `    <wp:term_name><![CDATA[${term.name}]]></wp:term_name>\n`;
      xml += `    <wp:term_description><![CDATA[${term.description || ''}]]></wp:term_description>\n`;
      xml += '  </wp:term>\n';
    }
  }

  // Export posts
  if (data.data.posts) {
    for (const post of data.data.posts) {
      xml += '  <item>\n';
      xml += `    <title>${escapeXml(post.title)}</title>\n`;
      xml += `    <link>${escapeXml(siteUrl)}/${post.slug}</link>\n`;
      xml += `    <pubDate>${post.published_at ? new Date(post.published_at).toUTCString() : new Date(post.created_at).toUTCString()}</pubDate>\n`;
      xml += `    <dc:creator><![CDATA[${post.author_id}]]></dc:creator>\n`;
      xml += `    <guid isPermaLink="false">${escapeXml(siteUrl)}/?p=${post.id}</guid>\n`;
      xml += `    <description></description>\n`;
      xml += `    <content:encoded><![CDATA[${post.content || ''}]]></content:encoded>\n`;
      xml += `    <excerpt:encoded><![CDATA[${post.excerpt || ''}]]></excerpt:encoded>\n`;
      xml += `    <wp:post_id>${post.id}</wp:post_id>\n`;
      xml += `    <wp:post_date>${formatDate(post.published_at || post.created_at)}</wp:post_date>\n`;
      xml += `    <wp:post_date_gmt>${formatDate(post.published_at || post.created_at)}</wp:post_date_gmt>\n`;
      xml += `    <wp:post_modified>${formatDate(post.updated_at)}</wp:post_modified>\n`;
      xml += `    <wp:post_modified_gmt>${formatDate(post.updated_at)}</wp:post_modified_gmt>\n`;
      xml += `    <wp:comment_status>closed</wp:comment_status>\n`;
      xml += `    <wp:ping_status>closed</wp:ping_status>\n`;
      xml += `    <wp:post_name><![CDATA[${post.slug}]]></wp:post_name>\n`;
      xml += `    <wp:status>${post.status === 'published' ? 'publish' : post.status}</wp:status>\n`;
      xml += `    <wp:post_parent>${post.parent_id || 0}</wp:post_parent>\n`;
      xml += `    <wp:menu_order>${post.menu_order || 0}</wp:menu_order>\n`;
      xml += `    <wp:post_type><![CDATA[${post.post_type}]]></wp:post_type>\n`;
      xml += `    <wp:post_password></wp:post_password>\n`;
      xml += `    <wp:is_sticky>0</wp:is_sticky>\n`;

      // Add post meta
      if (post.meta && Array.isArray(post.meta)) {
        for (const meta of post.meta) {
          xml += `    <wp:postmeta>\n`;
          xml += `      <wp:meta_key><![CDATA[${meta.meta_key}]]></wp:meta_key>\n`;
          xml += `      <wp:meta_value><![CDATA[${meta.meta_value}]]></wp:meta_value>\n`;
          xml += `    </wp:postmeta>\n`;
        }
      }

      // Add taxonomy terms
      if (data.data.taxonomies?.term_relationships) {
        const postTerms = data.data.taxonomies.term_relationships.filter((rel: any) => rel.post_id === post.id);
        for (const rel of postTerms) {
          const term = data.data.taxonomies.terms.find((t: any) => t.id === rel.term_id);
          const taxonomy = data.data.taxonomies.taxonomies.find((tax: any) => tax.id === term?.taxonomy_id);
          if (term && taxonomy) {
            xml += `    <category domain="${taxonomy.name}" nicename="${term.slug}"><![CDATA[${term.name}]]></category>\n`;
          }
        }
      }

      xml += '  </item>\n';
    }
  }

  xml += '</channel>\n';
  xml += '</rss>';

  return xml;
}

/**
 * Generate CSV export for posts
 */
export function generatePostsCSV(posts: any[]): string {
  if (!posts || posts.length === 0) {
    return 'id,title,slug,content,excerpt,status,post_type,author_id,featured_image_id,parent_id,menu_order,published_at,created_at,updated_at\n';
  }

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  let csv = 'id,title,slug,content,excerpt,status,post_type,author_id,featured_image_id,parent_id,menu_order,published_at,created_at,updated_at\n';
  
  for (const post of posts) {
    csv += [
      post.id,
      escapeCSV(post.title),
      escapeCSV(post.slug),
      escapeCSV(post.content),
      escapeCSV(post.excerpt),
      post.status,
      post.post_type,
      post.author_id,
      post.featured_image_id || '',
      post.parent_id || '',
      post.menu_order || 0,
      post.published_at || '',
      post.created_at,
      post.updated_at
    ].join(',') + '\n';
  }

  return csv;
}

/**
 * Generate CSV export for media
 */
export function generateMediaCSV(media: any[]): string {
  if (!media || media.length === 0) {
    return 'id,filename,original_name,title,alt_text,mime_type,size,url,folder_id,uploaded_by,created_at\n';
  }

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  let csv = 'id,filename,original_name,title,alt_text,mime_type,size,url,folder_id,uploaded_by,created_at\n';
  
  for (const item of media) {
    csv += [
      item.id,
      escapeCSV(item.filename),
      escapeCSV(item.original_name),
      escapeCSV(item.title),
      escapeCSV(item.alt_text),
      item.mime_type,
      item.size,
      escapeCSV(item.url),
      item.folder_id || '',
      item.uploaded_by,
      item.created_at
    ].join(',') + '\n';
  }

  return csv;
}

/**
 * Generate CSV export for taxonomies and terms
 */
export function generateTaxonomiesCSV(taxonomies: any[], terms: any[]): string {
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  let csv = '# Taxonomies\n';
  csv += 'id,name,label,singular_label,description,hierarchical,public,created_at\n';
  
  for (const tax of taxonomies) {
    csv += [
      tax.id,
      escapeCSV(tax.name),
      escapeCSV(tax.label),
      escapeCSV(tax.singular_label),
      escapeCSV(tax.description),
      tax.hierarchical ? 'true' : 'false',
      tax.public ? 'true' : 'false',
      tax.created_at
    ].join(',') + '\n';
  }

  csv += '\n# Terms\n';
  csv += 'id,taxonomy_id,name,slug,description,parent_id,created_at\n';
  
  for (const term of terms) {
    csv += [
      term.id,
      term.taxonomy_id,
      escapeCSV(term.name),
      escapeCSV(term.slug),
      escapeCSV(term.description),
      term.parent_id || '',
      term.created_at
    ].join(',') + '\n';
  }

  return csv;
}

/**
 * Generate CSV export for users
 */
export function generateUsersCSV(users: any[]): string {
  if (!users || users.length === 0) {
    return 'id,username,first_name,last_name,email,role_id,created_at\n';
  }

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  let csv = 'id,username,first_name,last_name,email,role_id,created_at\n';
  
  for (const user of users) {
    csv += [
      user.id,
      escapeCSV(user.username),
      escapeCSV(user.first_name),
      escapeCSV(user.last_name),
      escapeCSV(user.email),
      user.role_id,
      user.created_at
    ].join(',') + '\n';
  }

  return csv;
}

/**
 * Generate SQL dump export
 */
export function generateSQLDump(data: ExportData): string {
  let sql = '-- Next CMS SQL Export\n';
  sql += `-- Generated: ${data.exported_at}\n`;
  sql += `-- Version: ${data.version}\n\n`;
  sql += 'SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n';
  sql += 'SET time_zone = "+00:00";\n\n';

  const escapeSQL = (value: any): string => {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? '1' : '0';
    return "'" + String(value).replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
  };

  // Export Post Types
  if (data.data.postTypes?.post_types) {
    sql += '\n-- Post Types\n';
    for (const postType of data.data.postTypes.post_types) {
      sql += `INSERT INTO post_types (id, name, slug, label, singular_label, description, icon, url_structure, supports, public, show_in_dashboard, hierarchical, menu_position, created_at, updated_at) VALUES (`;
      sql += `${postType.id}, ${escapeSQL(postType.name)}, ${escapeSQL(postType.slug)}, ${escapeSQL(postType.label)}, ${escapeSQL(postType.singular_label)}, ${escapeSQL(postType.description)}, ${escapeSQL(postType.icon)}, ${escapeSQL(postType.url_structure)}, ${escapeSQL(postType.supports)}, ${postType.public ? 1 : 0}, ${postType.show_in_dashboard ? 1 : 0}, ${postType.hierarchical ? 1 : 0}, ${postType.menu_position}, ${escapeSQL(postType.created_at)}, ${escapeSQL(postType.updated_at)});\n`;
    }
  }

  // Export Taxonomies
  if (data.data.taxonomies?.taxonomies) {
    sql += '\n-- Taxonomies\n';
    for (const tax of data.data.taxonomies.taxonomies) {
      sql += `INSERT INTO taxonomies (id, name, label, singular_label, description, hierarchical, public, show_in_menu, show_in_dashboard, menu_position, created_at, updated_at) VALUES (`;
      sql += `${tax.id}, ${escapeSQL(tax.name)}, ${escapeSQL(tax.label)}, ${escapeSQL(tax.singular_label)}, ${escapeSQL(tax.description)}, ${tax.hierarchical ? 1 : 0}, ${tax.public ? 1 : 0}, ${tax.show_in_menu ? 1 : 0}, ${tax.show_in_dashboard ? 1 : 0}, ${tax.menu_position}, ${escapeSQL(tax.created_at)}, ${escapeSQL(tax.updated_at)});\n`;
    }

    // Export Terms
    if (data.data.taxonomies.terms) {
      sql += '\n-- Terms\n';
      for (const term of data.data.taxonomies.terms) {
        sql += `INSERT INTO terms (id, taxonomy_id, name, slug, description, parent_id, created_at, updated_at) VALUES (`;
        sql += `${term.id}, ${term.taxonomy_id}, ${escapeSQL(term.name)}, ${escapeSQL(term.slug)}, ${escapeSQL(term.description)}, ${term.parent_id || 'NULL'}, ${escapeSQL(term.created_at)}, ${escapeSQL(term.updated_at)});\n`;
      }
    }
  }

  // Export Posts
  if (data.data.posts) {
    sql += '\n-- Posts\n';
    for (const post of data.data.posts) {
      sql += `INSERT INTO posts (id, title, slug, content, excerpt, status, post_type, author_id, featured_image_id, parent_id, menu_order, published_at, scheduled_publish_at, created_at, updated_at) VALUES (`;
      sql += `${post.id}, ${escapeSQL(post.title)}, ${escapeSQL(post.slug)}, ${escapeSQL(post.content)}, ${escapeSQL(post.excerpt)}, ${escapeSQL(post.status)}, ${escapeSQL(post.post_type)}, ${post.author_id}, ${post.featured_image_id || 'NULL'}, ${post.parent_id || 'NULL'}, ${post.menu_order || 0}, ${escapeSQL(post.published_at)}, ${escapeSQL(post.scheduled_publish_at)}, ${escapeSQL(post.created_at)}, ${escapeSQL(post.updated_at)});\n`;

      // Export post meta
      if (post.meta && Array.isArray(post.meta)) {
        for (const meta of post.meta) {
          sql += `INSERT INTO post_meta (post_id, meta_key, meta_value) VALUES (${post.id}, ${escapeSQL(meta.meta_key)}, ${escapeSQL(meta.meta_value)});\n`;
        }
      }
    }
  }

  // Export Media
  if (data.data.media) {
    sql += '\n-- Media\n';
    for (const media of data.data.media) {
      sql += `INSERT INTO media (id, filename, original_name, title, alt_text, mime_type, size, url, sizes, folder_id, uploaded_by, created_at) VALUES (`;
      sql += `${media.id}, ${escapeSQL(media.filename)}, ${escapeSQL(media.original_name)}, ${escapeSQL(media.title)}, ${escapeSQL(media.alt_text)}, ${escapeSQL(media.mime_type)}, ${media.size}, ${escapeSQL(media.url)}, ${escapeSQL(media.sizes)}, ${media.folder_id || 'NULL'}, ${media.uploaded_by}, ${escapeSQL(media.created_at)});\n`;
    }
  }

  // Export Settings
  if (data.data.settings) {
    sql += '\n-- Settings\n';
    for (const setting of data.data.settings) {
      sql += `INSERT INTO settings (setting_key, setting_value) VALUES (${escapeSQL(setting.setting_key)}, ${escapeSQL(setting.setting_value)}) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);\n`;
    }
  }

  return sql;
}

