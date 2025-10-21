import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels } from '@/lib/model-factory';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import { unlink } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
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

    const Media = await SiteModels.Media(siteId);

    // Find all media in trash for this site
    const trashedMedia = await Media.find({ 
      status: 'trash' 
    }).lean();

    if (trashedMedia.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    // Delete physical files (original + all sizes)
    for (const media of trashedMedia) {
      // Delete original file
      try {
        const filepath = path.join(process.cwd(), 'public', (media as any).filepath);
        await unlink(filepath);
      } catch (fileError) {
        console.error(`Error deleting file ${(media as any).filepath}:`, fileError);
        // Continue with size deletion
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
          // Continue with next media file
        }
      }
    }

    // Delete from database
    const result = await Media.deleteMany({ 
      status: 'trash' 
    });

    // Log activity
    await logActivity({
      userId,
      action: 'media_emptied_trash' as any,
      entityType: 'media' as any,
      entityId: 'multiple',
      entityName: 'Multiple media files',
      details: `Permanently deleted ${result.deletedCount} media file(s) from trash`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    console.error('Error emptying trash:', error);
    return NextResponse.json({ error: 'Failed to empty trash' }, { status: 500 });
  }
}
