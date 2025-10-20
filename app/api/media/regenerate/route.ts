import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import db, { getSiteTable } from '@/lib/db';
import { writeFile, mkdir, unlink, rename } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

// Disable sharp cache to prevent file locking
sharp.cache(false);

// Helper function to delete file with retries (for Windows file locking)
async function deleteFileWithRetry(filePath: string, maxRetries = 3, delayMs = 100): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await unlink(filePath);
      return;
    } catch (error: any) {
      if (error.code === 'EPERM' && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else if (error.code !== 'ENOENT') {
        // Only throw if it's not a "file not found" error
        throw error;
      }
    }
  }
}

// Helper function to clean up .old files from previous regenerations
async function cleanupOldFiles(uploadDir: string): Promise<void> {
  try {
    const fs = require('fs/promises');
    const files = await fs.readdir(uploadDir);
    
    for (const file of files) {
      if (file.endsWith('.old')) {
        const oldFilePath = path.join(uploadDir, file);
        try {
          await unlink(oldFilePath);
        } catch (error) {
          // Ignore errors, file might still be locked
        }
      }
    }
  } catch (error) {
    // Directory might not exist, ignore
  }
}

// Get image sizes from settings
async function getImageSizes(siteId: number = 1) {
  try {
    const settingsTable = getSiteTable(siteId, 'settings');
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT setting_value FROM ${settingsTable} WHERE setting_key = 'image_sizes'`
    );
    
    if (rows.length > 0 && rows[0].setting_value) {
      const sizes = JSON.parse(rows[0].setting_value);
      return { ...sizes, full: null }; // Always include full (original)
    }
  } catch (error) {
    console.error('Error loading image sizes from settings:', error);
  }
  
  // Fallback to defaults
  return {
    thumbnail: { width: 150, height: 150, crop: 'cover' },
    medium: { width: 300, height: 300, crop: 'inside' },
    large: { width: 1024, height: 1024, crop: 'inside' },
    full: null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin || false;
    const userRole = (session?.user as any)?.role;
    
    if (!session?.user || (!isSuperAdmin && userRole !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await request.json();
    const { mediaId } = body; // If null, regenerate all images

    // Get site ID for multi-site support
    const siteId = (session.user as any).currentSiteId || 1;
    const mediaTable = getSiteTable(siteId, 'media');

    // Get media items to process
    let query = `SELECT * FROM ${mediaTable} WHERE mime_type LIKE ?`;
    let params: any[] = ['image/%'];
    
    if (mediaId) {
      query += ' AND id = ?';
      params.push(mediaId);
    }

    const [mediaItems] = await db.query<RowDataPacket[]>(query, params);

    if (mediaItems.length === 0) {
      return NextResponse.json({ error: 'No images found' }, { status: 404 });
    }

    const IMAGE_SIZES = await getImageSizes(siteId);
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Clean up any .old files from previous regenerations
    const uploadDirs = new Set<string>();
    for (const media of mediaItems) {
      const urlParts = media.url.split('/');
      const folderPath = urlParts.slice(0, -1).join('/').replace('/uploads/', '');
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', folderPath);
      uploadDirs.add(uploadDir);
    }
    
    for (const dir of Array.from(uploadDirs)) {
      await cleanupOldFiles(dir);
    }

    for (const media of mediaItems) {
      try {
        // Store before state for activity log
        const beforeSizes = media.sizes ? JSON.parse(media.sizes) : null;
        
        // Get the original file path
        const originalPath = path.join(process.cwd(), 'public', media.url);
        
        // Load the original image into a buffer to avoid file locking issues
        const originalBuffer = await sharp(originalPath).toBuffer();
        const image = sharp(originalBuffer);
        const metadata = await image.metadata();

        // Delete old size variant files if they exist
        if (media.sizes) {
          try {
            const oldSizes = JSON.parse(media.sizes);
            for (const [sizeName, sizeData] of Object.entries(oldSizes)) {
              if (sizeName !== 'full') { // Don't delete the original yet
                const oldUrl = (sizeData as any).url;
                // Convert URL path to file system path
                const relativePath = oldUrl.replace(/^\//, '').replace(/\//g, path.sep);
                const oldPath = path.join(process.cwd(), 'public', relativePath);
                try {
                  await deleteFileWithRetry(oldPath);
                } catch (error) {
                  // Continue even if deletion fails
                }
              }
            }
          } catch (error) {
            console.error('Error parsing or deleting old files:', error);
          }
        }

        // Extract base name and extension from original
        const urlParts = media.url.split('/');
        const originalFilename = urlParts[urlParts.length - 1];
        const ext = path.extname(originalFilename);
        
        // Extract the base name without timestamp and extension
        // E.g., "sunset-1234567890.jpg" -> "sunset"
        const baseNameMatch = originalFilename.match(/^(.+?)-\d+/);
        const baseName = baseNameMatch ? baseNameMatch[1] : path.basename(originalFilename, ext);
        
        // Generate new timestamp for cache busting
        const newTimestamp = Date.now();
        const newBaseFilename = `${baseName}-${newTimestamp}`;
        
        const folderPath = urlParts.slice(0, -1).join('/').replace('/uploads/', '');
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', folderPath);
        
        // Ensure directory exists
        await mkdir(uploadDir, { recursive: true });

        const sizes: any = {};

        // Generate different sizes with new timestamp
        for (const [sizeName, dimensions] of Object.entries(IMAGE_SIZES)) {
          if (sizeName === 'full') {
            // Rename the original file with new timestamp
            const newFilename = `${newBaseFilename}${ext}`;
            const newFilepath = path.join(uploadDir, newFilename);
            const newUrl = `/uploads/${folderPath}/${newFilename}`;
            
            // Write the original buffer to new filename
            await writeFile(newFilepath, originalBuffer);
            
            sizes.full = {
              url: newUrl,
              width: metadata.width,
              height: metadata.height,
            };
          } else {
            // Create size variant with new timestamp
            const newFilename = `${newBaseFilename}-${sizeName}${ext}`;
            const filepath = path.join(uploadDir, newFilename);
            
            // Get crop style from dimensions (default to 'inside')
            const cropStyle = (dimensions as any).crop || 'inside';
            
            const resized = await image
              .resize((dimensions as any).width, (dimensions as any).height, {
                fit: cropStyle,
                withoutEnlargement: cropStyle === 'inside',
                position: 'centre',
              })
              .toBuffer();
            
            const resizedImage = sharp(resized);
            const resizedMeta = await resizedImage.metadata();
            
            await writeFile(filepath, resized);
            
            sizes[sizeName] = {
              url: `/uploads/${folderPath}/${newFilename}`,
              width: resizedMeta.width,
              height: resizedMeta.height,
            };
          }
        }

        // Now delete the old original file (after new one is created)
        // Windows file locking workaround: rename first, then delete
        if (sizes.full.url !== media.url) {
          try {
            // Rename to .old extension first (this works even if file is locked)
            const oldPath = `${originalPath}.old`;
            await rename(originalPath, oldPath);
            
            // Give Windows a moment, then try to delete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            try {
              await unlink(oldPath);
            } catch (delError) {
              // If deletion fails, the .old file will be cleaned up on next regeneration
            }
          } catch (error) {
            // Don't fail the whole operation if deletion fails
          }
        }

        // Update database with new sizes and URL
        await db.query<ResultSetHeader>(
          `UPDATE ${mediaTable} SET url = ?, filename = ?, sizes = ? WHERE id = ?`,
          [sizes.full.url, `${newBaseFilename}${ext}`, JSON.stringify(sizes), media.id]
        );

        // Log activity for this media item
        const userId = (session.user as any).id;
        await logActivity({
          userId,
          action: 'media_updated',
          entityType: 'media',
          entityId: media.id,
          siteId,
          entityName: media.original_name,
          details: 'Regenerated image sizes',
          ipAddress: getClientIp(request),
          userAgent: getUserAgent(request),
          changesBefore: { sizes: beforeSizes },
          changesAfter: { sizes },
        });

        results.success++;
      } catch (error) {
        console.error(`Error regenerating sizes for media ${media.id}:`, error);
        results.failed++;
        results.errors.push(`${media.original_name}: ${(error as Error).message}`);
      }
    }

    return NextResponse.json({
      message: `Regenerated ${results.success} image(s)`,
      success: results.success,
      failed: results.failed,
      errors: results.errors,
      total: mediaItems.length,
    });
  } catch (error) {
    console.error('Error regenerating media:', error);
    return NextResponse.json({ error: 'Failed to regenerate media' }, { status: 500 });
  }
}

