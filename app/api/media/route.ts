import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

// Get image sizes from settings
async function getImageSizes() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT setting_value FROM settings WHERE setting_key = 'image_sizes'"
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
    thumbnail: { width: 150, height: 150 },
    medium: { width: 300, height: 300 },
    large: { width: 1024, height: 1024 },
    full: null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const folderId = searchParams.get('folder_id');
    const showTrash = searchParams.get('trash') === 'true';

    let query = `SELECT m.*, CONCAT(u.first_name, ' ', u.last_name) as uploaded_by_name 
                 FROM media m 
                 LEFT JOIN users u ON m.uploaded_by = u.id`;
    let countQuery = 'SELECT COUNT(*) as total FROM media';
    const params: any[] = [];
    const countParams: any[] = [];
    const conditions: string[] = [];

    // Filter by trash status
    if (showTrash) {
      conditions.push('m.deleted_at IS NOT NULL');
      countParams.push('1=1'); // Placeholder for easier logic
    } else {
      conditions.push('m.deleted_at IS NULL');
      countParams.push('1=1');
    }

    // Filter by folder
    if (folderId) {
      conditions.push('m.folder_id = ?');
      params.push(parseInt(folderId));
      countParams.push(parseInt(folderId));
    } else if (folderId === null || searchParams.has('folder_id')) {
      // If folder_id is explicitly null, show root level only
      conditions.push('m.folder_id IS NULL');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
      // Build count query conditions
      const countConditions = [];
      if (showTrash) {
        countConditions.push('deleted_at IS NOT NULL');
      } else {
        countConditions.push('deleted_at IS NULL');
      }
      if (folderId) {
        countConditions.push('folder_id = ?');
      } else if (folderId === null || searchParams.has('folder_id')) {
        countConditions.push('folder_id IS NULL');
      }
      if (countConditions.length > 0) {
        countQuery += ' WHERE ' + countConditions.join(' AND ');
      }
    }

    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.query<RowDataPacket[]>(query, params);
    const [countRows] = await db.query<RowDataPacket[]>(countQuery, countParams.filter((p: any) => typeof p === 'number'));
    const total = countRows[0].total;

    return NextResponse.json({ media: rows, total });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string || '';
    const altText = formData.get('alt_text') as string || '';
    const folderId = formData.get('folder_id') as string || null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create date-based folder structure (YYYY/MM)
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const folderPath = `${year}/${month}`; // Always use forward slashes for URLs
    
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', year, month);
    await mkdir(uploadDir, { recursive: true });

    // Generate clean filename
    const ext = path.extname(file.name);
    const nameWithoutExt = path.basename(file.name, ext).replace(/[^a-zA-Z0-9-]/g, '_');
    const timestamp = Date.now();
    const baseFilename = `${nameWithoutExt}-${timestamp}`;
    
    const sizes: any = {};
    const userId = (session.user as any).id;

    // Check if it's an image
    if (file.type.startsWith('image/')) {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Get image sizes from settings
      const IMAGE_SIZES = await getImageSizes();

      // Generate different sizes
      for (const [sizeName, dimensions] of Object.entries(IMAGE_SIZES)) {
        if (sizeName === 'full') {
          // Save original
          const filename = `${baseFilename}${ext}`;
          const filepath = path.join(uploadDir, filename);
          await writeFile(filepath, buffer);
          sizes.full = {
            url: `/uploads/${folderPath}/${filename}`,
            width: metadata.width,
            height: metadata.height,
          };
        } else {
          // Resize and save with specified crop style
          const filename = `${baseFilename}-${sizeName}${ext}`;
          const filepath = path.join(uploadDir, filename);
          
          // Get crop style from dimensions (default to 'inside')
          const cropStyle = (dimensions as any).crop || 'inside';
          
          const resized = await image
            .resize(dimensions!.width, dimensions!.height, {
              fit: cropStyle, // Use configured crop style
              withoutEnlargement: cropStyle === 'inside', // Only for 'inside' fit
              position: 'centre', // Center the crop
            })
            .toBuffer();
          
          const resizedImage = sharp(resized);
          const resizedMeta = await resizedImage.metadata();
          
          await writeFile(filepath, resized);
          
          sizes[sizeName] = {
            url: `/uploads/${folderPath}/${filename}`,
            width: resizedMeta.width,
            height: resizedMeta.height,
          };
        }
      }

      // Use full size as main URL
      const url = sizes.full.url;
      const filename = `${baseFilename}${ext}`;

      const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO media (filename, original_name, title, alt_text, mime_type, size, url, sizes, folder_id, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [filename, file.name, title, altText, file.type, file.size, url, JSON.stringify(sizes), folderId ? parseInt(folderId) : null, userId]
      );

      const [newMedia] = await db.query<RowDataPacket[]>(
        'SELECT * FROM media WHERE id = ?',
        [result.insertId]
      );

      // Log activity
      await logActivity({
        userId,
        action: 'media_uploaded',
        entityType: 'media',
        entityId: result.insertId,
        entityName: file.name,
        details: `Uploaded image: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      });

      return NextResponse.json({ media: newMedia[0] }, { status: 201 });
    } else {
      // Non-image files - just save original
      const filename = `${baseFilename}${ext}`;
      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);

      const url = `/uploads/${folderPath}/${filename}`;

      const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO media (filename, original_name, title, alt_text, mime_type, size, url, folder_id, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [filename, file.name, title, altText, file.type, file.size, url, folderId ? parseInt(folderId) : null, userId]
      );

      const [newMedia] = await db.query<RowDataPacket[]>(
        'SELECT * FROM media WHERE id = ?',
        [result.insertId]
      );

      // Log activity
      await logActivity({
        userId,
        action: 'media_uploaded',
        entityType: 'media',
        entityId: result.insertId,
        entityName: file.name,
        details: `Uploaded file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      });

      return NextResponse.json({ media: newMedia[0] }, { status: 201 });
    }
  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json({ error: 'Failed to upload media' }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};

