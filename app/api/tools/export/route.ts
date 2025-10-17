import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import archiver from 'archiver';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  generateWordPressXML,
  generatePostsCSV,
  generateMediaCSV,
  generateTaxonomiesCSV,
  generateUsersCSV,
  generateSQLDump
} from '@/lib/export-utils';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const userPermissions = (session.user as any).permissions || {};
    if (!userPermissions.manage_settings) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const options = await request.json();
    const format = options.format || 'json'; // json, xml, csv, sql, zip
    
    // Get current site ID from session
    const currentSiteId = (session.user as any).currentSiteId || 1;
    
    const exportData: any = {
      version: '1.18.0',
      exported_at: new Date().toISOString(),
      exported_by: session.user.email,
      site_id: currentSiteId,
      data: {},
    };

    // Export Posts & Pages
    if (options.posts) {
      const [posts] = await db.query<RowDataPacket[]>(`
        SELECT * FROM ${getSiteTable(currentSiteId, 'posts')} ORDER BY id
      `);
      
      // Fetch post meta separately
      const [postMeta] = await db.query<RowDataPacket[]>(`
        SELECT * FROM ${getSiteTable(currentSiteId, 'post_meta')} ORDER BY post_id, meta_key
      `);
      
      // Attach meta to each post
      const postsWithMeta = posts.map((post: any) => ({
        ...post,
        meta: postMeta.filter((meta: any) => meta.post_id === post.id)
      }));
      
      exportData.data.posts = postsWithMeta;
    }

    // Export Media
    if (options.media) {
      // Export folders first
      const [mediaFolders] = await db.query<RowDataPacket[]>(`
        SELECT * FROM ${getSiteTable(currentSiteId, 'media_folders')} ORDER BY id
      `);
      
      const [media] = await db.query<RowDataPacket[]>(`
        SELECT * FROM ${getSiteTable(currentSiteId, 'media')} ORDER BY id
      `);
      
      exportData.data.media_folders = mediaFolders;
      exportData.data.media = media;
    }

    // Export Taxonomies
    if (options.taxonomies) {
      const [taxonomies] = await db.query<RowDataPacket[]>(`
        SELECT * FROM ${getSiteTable(currentSiteId, 'taxonomies')} ORDER BY id
      `);
      
      const [terms] = await db.query<RowDataPacket[]>(`
        SELECT * FROM ${getSiteTable(currentSiteId, 'terms')} ORDER BY id
      `);
      
      const [termRelationships] = await db.query<RowDataPacket[]>(`
        SELECT * FROM ${getSiteTable(currentSiteId, 'term_relationships')} ORDER BY post_id, term_id
      `);

      exportData.data.taxonomies = {
        taxonomies,
        terms,
        term_relationships: termRelationships,
      };
    }

    // Export Menus
    if (options.menus) {
      const [menus] = await db.query<RowDataPacket[]>(`
        SELECT * FROM ${getSiteTable(currentSiteId, 'menus')} ORDER BY id
      `);
      
      const [menuItems] = await db.query<RowDataPacket[]>(`
        SELECT * FROM ${getSiteTable(currentSiteId, 'menu_items')} ORDER BY menu_id, menu_order
      `);
      
      // Fetch menu item meta separately
      const [menuItemMeta] = await db.query<RowDataPacket[]>(`
        SELECT * FROM ${getSiteTable(currentSiteId, 'menu_item_meta')} ORDER BY menu_item_id, meta_key
      `);
      
      // Attach meta to each menu item
      const menuItemsWithMeta = menuItems.map((item: any) => ({
        ...item,
        meta: menuItemMeta.filter((meta: any) => meta.menu_item_id === item.id)
      }));
      
      const [menuLocations] = await db.query<RowDataPacket[]>(`
        SELECT * FROM ${getSiteTable(currentSiteId, 'menu_locations')} ORDER BY id
      `);

      exportData.data.menus = {
        menus,
        menu_items: menuItemsWithMeta,
        menu_locations: menuLocations,
      };
    }

    // Export Post Types
    if (options.postTypes) {
      const [postTypes] = await db.query<RowDataPacket[]>(`
        SELECT * FROM ${getSiteTable(currentSiteId, 'post_types')} ORDER BY id
      `);
      
      const [postTypeTaxonomies] = await db.query<RowDataPacket[]>(`
        SELECT * FROM ${getSiteTable(currentSiteId, 'post_type_taxonomies')} ORDER BY post_type_id, taxonomy_id
      `);

      exportData.data.postTypes = {
        post_types: postTypes,
        post_type_taxonomies: postTypeTaxonomies,
      };
    }

    // Export Settings
    if (options.settings) {
      const [settings] = await db.query<RowDataPacket[]>(`
        SELECT * FROM ${getSiteTable(currentSiteId, 'settings')} ORDER BY setting_key
      `);
      exportData.data.settings = settings;
    }

    // Export Users (excluding passwords) - Global tables, not site-specific
    if (options.users) {
      const [users] = await db.query<RowDataPacket[]>(`
        SELECT 
          id, username, first_name, last_name, email, role_id, created_at, updated_at
        FROM users 
        ORDER BY id
      `);
      
      const [roles] = await db.query<RowDataPacket[]>(`
        SELECT * FROM roles ORDER BY id
      `);
      
      const [userMeta] = await db.query<RowDataPacket[]>(`
        SELECT * FROM user_meta WHERE site_id = ? ORDER BY user_id, meta_key
      `, [currentSiteId]);

      exportData.data.users = {
        users,
        roles,
        user_meta: userMeta,
      };
    }

    // Return data in requested format
    const timestamp = Date.now();
    const siteUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Prepare export details for logging
    const exportTypes = [];
    if (options.posts) exportTypes.push('posts');
    if (options.media) exportTypes.push('media');
    if (options.taxonomies) exportTypes.push('taxonomies');
    if (options.menus) exportTypes.push('menus');
    if (options.postTypes) exportTypes.push('post_types');
    if (options.settings) exportTypes.push('settings');
    if (options.users) exportTypes.push('users');

    switch (format) {
      case 'xml': {
        // WordPress WXR XML format
        const xmlContent = generateWordPressXML(exportData, siteUrl);
        
        // Log export activity
        await logActivity({
          userId: (session.user as any).id,
          action: 'data_exported',
          entityType: 'data',
          entityName: `Export (XML)`,
          details: {
            format: 'xml',
            types: exportTypes,
            posts_count: exportData.data.posts?.length || 0,
            media_count: exportData.data.media?.length || 0,
          },
          ipAddress: getClientIp(request),
          userAgent: getUserAgent(request),
          siteId: currentSiteId,
        });
        
        return new NextResponse(xmlContent, {
          headers: {
            'Content-Type': 'application/xml',
            'Content-Disposition': `attachment; filename="nextcms-export-${timestamp}.xml"`,
          },
        });
      }

      case 'csv': {
        // Generate multiple CSV files in a ZIP
        const archive = archiver('zip', { zlib: { level: 9 } });
        const chunks: Buffer[] = [];

        archive.on('data', (chunk: Buffer) => chunks.push(chunk));
        
        await new Promise<void>((resolve, reject) => {
          archive.on('end', () => resolve());
          archive.on('error', (err: Error) => reject(err));

          // Add CSV files to archive
          if (exportData.data.posts) {
            archive.append(generatePostsCSV(exportData.data.posts), { name: 'posts.csv' });
          }
          if (exportData.data.media) {
            archive.append(generateMediaCSV(exportData.data.media), { name: 'media.csv' });
          }
          if (exportData.data.taxonomies) {
            archive.append(
              generateTaxonomiesCSV(
                exportData.data.taxonomies.taxonomies,
                exportData.data.taxonomies.terms
              ),
              { name: 'taxonomies.csv' }
            );
          }
          if (exportData.data.users?.users) {
            archive.append(generateUsersCSV(exportData.data.users.users), { name: 'users.csv' });
          }

          // Add README
          const readme = `Next CMS CSV Export
Exported: ${exportData.exported_at}
By: ${exportData.exported_by}

Files included:
- posts.csv: All posts and pages
- media.csv: Media library metadata
- taxonomies.csv: Taxonomies and terms
- users.csv: User accounts (no passwords)

Note: This CSV export is for data analysis and backup.
For full site migration, use JSON or SQL format.
`;
          archive.append(readme, { name: 'README.txt' });

          archive.finalize();
        });

        const zipBuffer = Buffer.concat(chunks);
        
        // Log export activity
        await logActivity({
          userId: (session.user as any).id,
          action: 'data_exported',
          entityType: 'data',
          entityName: `Export (CSV)`,
          details: {
            format: 'csv',
            types: exportTypes,
            posts_count: exportData.data.posts?.length || 0,
            media_count: exportData.data.media?.length || 0,
          },
          ipAddress: getClientIp(request),
          userAgent: getUserAgent(request),
          siteId: currentSiteId,
        });
        
        return new NextResponse(zipBuffer, {
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="nextcms-export-${timestamp}.zip"`,
          },
        });
      }

      case 'sql': {
        // SQL dump format
        const sqlContent = generateSQLDump(exportData);
        
        // Log export activity
        await logActivity({
          userId: (session.user as any).id,
          action: 'data_exported',
          entityType: 'data',
          entityName: `Export (SQL)`,
          details: {
            format: 'sql',
            types: exportTypes,
            posts_count: exportData.data.posts?.length || 0,
            media_count: exportData.data.media?.length || 0,
          },
          ipAddress: getClientIp(request),
          userAgent: getUserAgent(request),
          siteId: currentSiteId,
        });
        
        return new NextResponse(sqlContent, {
          headers: {
            'Content-Type': 'application/sql',
            'Content-Disposition': `attachment; filename="nextcms-export-${timestamp}.sql"`,
          },
        });
      }

      case 'zip': {
        // ZIP archive with JSON + media files
        const fullArchive = archiver('zip', { zlib: { level: 9 } });
        const fullChunks: Buffer[] = [];

        fullArchive.on('data', (chunk: Buffer) => fullChunks.push(chunk));

        await new Promise<void>((resolve, reject) => {
          fullArchive.on('end', () => resolve());
          fullArchive.on('error', (err: Error) => reject(err));

          // Add JSON export
          const jsonString = JSON.stringify(exportData, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
          , 2);
          fullArchive.append(jsonString, { name: 'export.json' });

          // Add media files if they exist
          if (options.media && exportData.data.media) {
            const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
            
            for (const media of exportData.data.media) {
              const filePath = path.join(process.cwd(), 'public', media.url);
              if (fs.existsSync(filePath)) {
                const relativePath = path.relative(uploadsPath, filePath);
                fullArchive.file(filePath, { name: `uploads/${relativePath}` });
              }
            }
          }

          // Add README
          const fullReadme = `Next CMS Full Export (ZIP)
Exported: ${exportData.exported_at}
By: ${exportData.exported_by}
Version: ${exportData.version}

Contents:
- export.json: Complete data export
- uploads/: Media files (if media was selected)

To restore:
1. Import export.json via the Import tool
2. Copy uploads/ folder to public/uploads/ on target site

Note: Media files are included in this archive.
`;
          fullArchive.append(fullReadme, { name: 'README.txt' });

          fullArchive.finalize();
        });

        const fullZipBuffer = Buffer.concat(fullChunks);
        
        // Log export activity
        await logActivity({
          userId: (session.user as any).id,
          action: 'data_exported',
          entityType: 'data',
          entityName: `Export (Full ZIP)`,
          details: {
            format: 'zip',
            types: exportTypes,
            posts_count: exportData.data.posts?.length || 0,
            media_count: exportData.data.media?.length || 0,
            includes_media_files: true,
          },
          ipAddress: getClientIp(request),
          userAgent: getUserAgent(request),
          siteId: currentSiteId,
        });
        
        return new NextResponse(fullZipBuffer, {
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="nextcms-full-export-${timestamp}.zip"`,
          },
        });
      }

      default: {
        // JSON format (default)
        const jsonString = JSON.stringify(exportData, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        , 2);
        
        // Log export activity
        await logActivity({
          userId: (session.user as any).id,
          action: 'data_exported',
          entityType: 'data',
          entityName: `Export (JSON)`,
          details: {
            format: 'json',
            types: exportTypes,
            posts_count: exportData.data.posts?.length || 0,
            media_count: exportData.data.media?.length || 0,
          },
          ipAddress: getClientIp(request),
          userAgent: getUserAgent(request),
          siteId: currentSiteId,
        });
        
        return new NextResponse(jsonString, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="nextcms-export-${timestamp}.json"`,
          },
        });
      }
    }

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

