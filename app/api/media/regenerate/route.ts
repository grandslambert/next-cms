import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels } from '@/lib/model-factory';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { readFile, unlink } from 'fs/promises';
import path from 'path';

// Get image sizes from settings
async function getImageSizes(siteId: number) {
  try {
    const Setting = await SiteModels.Setting(siteId);
    const setting = await Setting.findOne({
      key: 'image_sizes',
    }).lean();
    
    if (setting && (setting as any).value) {
      return (setting as any).value;
    }
  } catch (error) {
    console.error('Error loading image sizes from settings:', error);
  }
  
  // Fallback to defaults
  return {
    thumbnail: { width: 150, height: 150, crop: 'cover' },
    medium: { width: 300, height: 300, crop: 'inside' },
    large: { width: 1024, height: 1024, crop: 'inside' },
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = (session.user as any).permissions || {};
    if (!permissions.manage_media) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId;

    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    const Media = await SiteModels.Media(siteId);
    const body = await request.json();
    const { mediaId } = body;

    let mediaItems: any[];

    if (mediaId === null || mediaId === 'all') {
      // Regenerate all images for this site
      mediaItems = await Media.find({ 
        mimetype: { $regex: /^image\// },
        status: 'active',
      }).lean();
    } else {
      // Regenerate specific image
      if (!mongoose.Types.ObjectId.isValid(mediaId)) {
        return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
      }

      const media = await Media.findOne({
        _id: new mongoose.Types.ObjectId(mediaId),
        mimetype: { $regex: /^image\// },
      }).lean();

      if (!media) {
        return NextResponse.json({ error: 'Image not found' }, { status: 404 });
      }

      mediaItems = [media];
    }

    const imageSizes = await getImageSizes(siteId);
    let successCount = 0;
    let failedCount = 0;

    for (const media of mediaItems) {
      try {
        const originalPath = path.join(process.cwd(), 'public', (media as any).filepath);
        const buffer = await readFile(originalPath);
        const image = sharp(buffer);
        const metadata = await image.metadata();

        const width = metadata.width || 0;
        const height = metadata.height || 0;

        // Get directory and base filename
        const urlPath = (media as any).filepath;
        const dir = path.dirname(urlPath);
        const ext = path.extname((media as any).filename);
        const baseName = path.basename((media as any).filename, ext);
        const timestamp = (media as any).filename.match(/-(\d+)$/)?.[1] || Date.now();
        const baseFilename = baseName.replace(/-\d+$/, '') + '-' + timestamp;
        const uploadDir = path.join(process.cwd(), 'public', dir);

        const generatedSizes: any = {};

        // Delete old size variants first
        if ((media as any).sizes) {
          try {
            const oldSizes = JSON.parse((media as any).sizes);
            for (const [sizeName, sizeData] of Object.entries(oldSizes)) {
              if (sizeName === 'full') continue;
              const sizeUrl = (sizeData as any).url;
              if (sizeUrl) {
                try {
                  await unlink(path.join(process.cwd(), 'public', sizeUrl));
                } catch (e) {
                  // File might not exist, continue
                }
              }
            }
          } catch (e) {
            // Continue if parsing fails
          }
        }

        // Generate new size variants
        for (const [sizeName, sizeConfig] of Object.entries(imageSizes)) {
          const { width: maxWidth, height: maxHeight, crop } = sizeConfig as {
            width: number;
            height: number;
            crop?: 'cover' | 'contain' | 'fill' | 'inside';
          };

          const cropStyle = crop || 'inside';
          const resizedFilename = `${baseFilename}-${sizeName}${ext}`;
          const resizedFilepath = path.join(uploadDir, resizedFilename);

          const resizeOptions: any = {
            width: maxWidth,
            height: maxHeight,
          };

          switch (cropStyle) {
            case 'cover':
              resizeOptions.fit = 'cover';
              resizeOptions.position = 'centre';
              break;
            case 'contain':
              resizeOptions.fit = 'contain';
              resizeOptions.background = { r: 255, g: 255, b: 255, alpha: 1 };
              break;
            case 'fill':
              resizeOptions.fit = 'fill';
              break;
            case 'inside':
            default:
              resizeOptions.fit = 'inside';
              resizeOptions.withoutEnlargement = true;
              break;
          }

          await sharp(buffer)
            .resize(resizeOptions)
            .toFile(resizedFilepath);

          const resizedMetadata = await sharp(resizedFilepath).metadata();

          generatedSizes[sizeName] = {
            url: `${dir}/${resizedFilename}`,
            width: resizedMetadata.width,
            height: resizedMetadata.height,
            crop: cropStyle,
          };
        }

        // Always include the full/original size
        generatedSizes.full = {
          url: urlPath,
          width,
          height,
        };

        // Update database
        await Media.findByIdAndUpdate((media as any)._id, {
          sizes: JSON.stringify(generatedSizes),
          width,
          height,
        });

        successCount++;
      } catch (error) {
        console.error(`Failed to regenerate ${(media as any).filename}:`, error);
        failedCount++;
      }
    }

    // Log activity
    await logActivity({
      userId,
      action: 'media_regenerated' as any,
      entityType: 'media' as any,
      entityId: mediaId || 'all',
      entityName: mediaId ? 'Single image' : 'All images',
      details: `Regenerated ${successCount} image(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ 
      success: true, 
      regenerated: successCount,
      failed: failedCount,
    });
  } catch (error) {
    console.error('Error regenerating images:', error);
    return NextResponse.json({ error: 'Failed to regenerate images' }, { status: 500 });
  }
}
