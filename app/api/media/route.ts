import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { Media, Setting } from '@/lib/models';
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
      key: 'image_sizes',
    }).lean();
    
    console.log('📐 Loading image sizes for site:', siteId);
    console.log('📐 Setting found:', setting);
    
    if (setting && (setting as any).value) {
      const sizes = (setting as any).value;
      console.log('📐 Using custom image sizes:', sizes);
      return { ...sizes, full: null }; // Always include full (original)
    }
  } catch (error) {
    console.error('Error loading image sizes from settings:', error);
  }
  
  console.log('📐 Using default image sizes (no custom settings found)');
  // Fallback to defaults (matching media settings page defaults)
  return {
    thumbnail: { width: 150, height: 150, crop: 'cover' },
    medium: { width: 300, height: 300, crop: 'inside' },
    large: { width: 1024, height: 1024, crop: 'inside' },
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
    const formattedMedia = media.map((m: any) => ({
      ...m,
      id: m._id.toString(),
      mime_type: m.mimetype, // Map mimetype to mime_type for frontend
      original_name: m.original_filename, // Map original_filename to original_name for frontend
      url: m.filepath, // Map filepath to url for frontend
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
    let sizes: any = null;

    // Check if it's an image
    if (file.type.startsWith('image/')) {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      width = metadata.width || null;
      height = metadata.height || null;

      // Save original image
      await writeFile(filepath, buffer);

      // Generate image sizes based on media settings
      const imageSizes = await getImageSizes(siteId);
      const generatedSizes: any = {};

      for (const [sizeName, sizeConfig] of Object.entries(imageSizes)) {
        if (sizeName === 'full' || !sizeConfig) {
          // Skip 'full' - that's the original
          continue;
        }

        const { width: maxWidth, height: maxHeight, crop } = sizeConfig as { 
          width: number; 
          height: number; 
          crop?: 'cover' | 'contain' | 'fill' | 'inside';
        };
        
        const cropStyle = crop || 'inside';
        const resizedFilename = `${baseFilename}-${sizeName}${ext}`;
        const resizedFilepath = path.join(uploadDir, resizedFilename);

        // Configure Sharp resize options based on crop style
        const resizeOptions: any = {
          width: maxWidth,
          height: maxHeight,
        };

        switch (cropStyle) {
          case 'cover':
            // Cover - fill entire area, crop excess
            resizeOptions.fit = 'cover';
            resizeOptions.position = 'centre';
            break;
          case 'contain':
            // Contain - fit entire image with letterboxing
            resizeOptions.fit = 'contain';
            resizeOptions.background = { r: 255, g: 255, b: 255, alpha: 1 };
            break;
          case 'fill':
            // Fill - stretch to exact dimensions
            resizeOptions.fit = 'fill';
            break;
          case 'inside':
          default:
            // Inside - fit within dimensions, maintain aspect ratio
            resizeOptions.fit = 'inside';
            resizeOptions.withoutEnlargement = true;
            break;
        }

        await sharp(buffer)
          .resize(resizeOptions)
          .toFile(resizedFilepath);

        const resizedMetadata = await sharp(resizedFilepath).metadata();

        generatedSizes[sizeName] = {
          url: `/uploads/${folderPath}/${resizedFilename}`,
          width: resizedMetadata.width,
          height: resizedMetadata.height,
          crop: cropStyle,
        };
      }

      // Always include the full/original size
      generatedSizes.full = {
        url: `/uploads/${folderPath}/${filename}`,
        width,
        height,
      };

      sizes = generatedSizes;
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
      sizes: sizes ? JSON.stringify(sizes) : null,
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

    const mediaObj = newMedia.toObject();
    return NextResponse.json({ 
      media: {
        ...mediaObj,
        id: newMedia._id.toString(),
        mime_type: mediaObj.mimetype, // Map mimetype to mime_type for frontend
        original_name: mediaObj.original_filename, // Map original_filename to original_name for frontend
        url: mediaObj.filepath, // Map filepath to url for frontend
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json({ error: 'Failed to upload media' }, { status: 500 });
  }
}
