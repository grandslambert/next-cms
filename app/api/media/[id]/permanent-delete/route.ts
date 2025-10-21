import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels } from '@/lib/model-factory';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';
import { unlink } from 'fs/promises';
import path from 'path';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId;

    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
    }

    const Media = await SiteModels.Media(siteId);
    const media = await Media.findById(params.id).lean();

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    if ((media as any).status !== 'trash') {
      return NextResponse.json({ error: 'Media must be in trash before permanent deletion' }, { status: 400 });
    }

    // Delete physical files (original + all sizes)
    try {
      const filepath = path.join(process.cwd(), 'public', (media as any).filepath);
      await unlink(filepath);
    } catch (fileError) {
      console.error('Error deleting original file:', fileError);
      // Continue with size deletion even if original fails
    }

    // Delete all size variants
    if ((media as any).sizes) {
      try {
        const sizes = JSON.parse((media as any).sizes);
        for (const [sizeName, sizeData] of Object.entries(sizes)) {
          if (sizeName === 'full') continue; // Skip full, it's the original
          
          const sizeUrl = (sizeData as any).url;
          if (sizeUrl) {
            try {
              const sizePath = path.join(process.cwd(), 'public', sizeUrl);
              await unlink(sizePath);
            } catch (sizeError) {
              console.error(`Error deleting ${sizeName} size:`, sizeError);
              // Continue with other sizes
            }
          }
        }
      } catch (sizesError) {
        console.error('Error parsing/deleting size variants:', sizesError);
        // Continue with database deletion
      }
    }

    // Delete from database
    await Media.findByIdAndDelete(params.id);

    // Log activity
    await logActivity({
      userId,
      action: 'media_permanently_deleted' as any,
      entityType: 'media' as any,
      entityId: params.id,
      entityName: (media as any).original_filename,
      details: `Permanently deleted media: ${(media as any).original_filename}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error permanently deleting media:', error);
    return NextResponse.json({ error: 'Failed to permanently delete media' }, { status: 500 });
  }
}
