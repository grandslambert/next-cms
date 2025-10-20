import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { Media, Setting, User } from '@/lib/models';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';

// Get image sizes from settings
async function getImageSizes(siteId: string) {
  try {
    await connectDB();
    const setting = await Setting.findOne({
      site_id: new mongoose.Types.ObjectId(siteId),
      setting_key: 'image_sizes',
    }).lean();
    
    if (setting && setting.setting_value) {
      const sizes = JSON.parse(setting.setting_value);
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
    const session = await getServerSession(authOptions);
    const siteId = (session?.user as any)?.currentSiteId;
    
    if (!siteId || !mongoose.Types.ObjectId.isValid(siteId)) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get('limit') || '20');
    const offset = Number.parseInt(searchParams.get('offset') || '0');
    const folderId = searchParams.get('folder_id');
    const showTrash = searchParams.get('trash') === 'true';

    await connectDB();

    const query: any = { site_id: new mongoose.Types.ObjectId(siteId) };

    // Filter by trash status
    if (showTrash) {
      query.status = 'trash';
    } else {
      query.status = 'active';
    }

    // Filter by folder
    if (folderId) {
      if (mongoose.Types.ObjectId.isValid(folderId)) {
        query.folder_id = new mongoose.Types.ObjectId(folderId);
      }
    } else if (searchParams.has('folder_id') && !folderId) {
      query.folder_id = null;
    }

    const [media, total] = await Promise.all([
      Media.find(query)
        .populate('uploaded_by', 'username email')
        .sort({ created_at: -1 })
        .limit(limit)
        .skip(offset)
        .lean(),
      Media.countDocuments(query),
    ]);

    // Format for UI compatibility
    const formattedMedia = media.map((m) => ({
      ...m,
      id: m._id.toString(),
      uploaded_by_name: (m.uploaded_by as any)?.username || 'Unknown',
    }));

    return NextResponse.json({ media: formattedMedia, total });
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

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId;

    if (!siteId || !mongoose.Types.ObjectId.isValid(siteId)) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const altText = formData.get('alt_text') as string || '';
    const caption = formData.get('caption') as string || '';
    const folderId = formData.get('folder_id') as string || null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create site-based and date-based folder structure (site_X/YYYY/MM)
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const folderPath = `site_${siteId}/${year}/${month}`;
    
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', `site_${siteId}`, year, month);
    await mkdir(uploadDir, { recursive: true });

    // Generate clean filename
    const ext = path.extname(file.name);
    const nameWithoutExt = path.basename(file.name, ext).replace(/[^a-zA-Z0-9-]/g, '_');
    const timestamp = Date.now();
    const baseFilename = `${nameWithoutExt}-${timestamp}`;
    const filename = `${baseFilename}${ext}`;
    const filepath = path.join(uploadDir, filename);

    let width: number | null = null;
    let height: number | null = null;

    // Check if it's an image
    if (file.type.startsWith('image/')) {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      width = metadata.width || null;
      height = metadata.height || null;

      // Save original image
      await writeFile(filepath, buffer);

      // TODO: Generate image sizes (thumbnail, medium, large) if needed
    } else {
      // Non-image files - just save original
      await writeFile(filepath, buffer);
    }

    await connectDB();

    const newMedia = await Media.create({
      site_id: new mongoose.Types.ObjectId(siteId),
      filename,
      original_filename: file.name,
      filepath: `/uploads/${folderPath}/${filename}`,
      mimetype: file.type,
      filesize: file.size,
      width,
      height,
      alt_text: altText,
      caption,
      uploaded_by: new mongoose.Types.ObjectId(userId),
      folder_id: folderId && mongoose.Types.ObjectId.isValid(folderId) ? new mongoose.Types.ObjectId(folderId) : null,
      status: 'active',
    });

    // Log activity
    await logActivity({
      userId,
      action: 'media_uploaded',
      entityType: 'media',
      entityId: newMedia._id.toString(),
      entityName: file.name,
      details: `Uploaded ${file.type.startsWith('image/') ? 'image' : 'file'}: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ 
      media: {
        ...newMedia.toObject(),
        id: newMedia._id.toString(),
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json({ error: 'Failed to upload media' }, { status: 500 });
  }
}
