import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Image size configurations (like WordPress)
const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  medium: { width: 300, height: 300 },
  large: { width: 1024, height: 1024 },
  full: null, // Original size
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT m.*, CONCAT(u.first_name, ' ', u.last_name) as uploaded_by_name 
       FROM media m 
       LEFT JOIN users u ON m.uploaded_by = u.id
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countRows] = await db.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM media');
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
          // Resize and save
          const filename = `${baseFilename}-${sizeName}${ext}`;
          const filepath = path.join(uploadDir, filename);
          
          const resized = await image
            .resize(dimensions!.width, dimensions!.height, {
              fit: 'inside',
              withoutEnlargement: true,
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
        `INSERT INTO media (filename, original_name, mime_type, size, url, sizes, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [filename, file.name, file.type, file.size, url, JSON.stringify(sizes), userId]
      );

      const [newMedia] = await db.query<RowDataPacket[]>(
        'SELECT * FROM media WHERE id = ?',
        [result.insertId]
      );

      return NextResponse.json({ media: newMedia[0] }, { status: 201 });
    } else {
      // Non-image files - just save original
      const filename = `${baseFilename}${ext}`;
      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);

      const url = `/uploads/${folderPath}/${filename}`;

      const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO media (filename, original_name, mime_type, size, url, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [filename, file.name, file.type, file.size, url, userId]
      );

      const [newMedia] = await db.query<RowDataPacket[]>(
        'SELECT * FROM media WHERE id = ?',
        [result.insertId]
      );

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

