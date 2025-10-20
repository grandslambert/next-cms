import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { Media } from '@/lib/models';
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

    await connectDB();

    // Find all media in trash
    const trashedMedia = await Media.find({ status: 'trash' }).lean();

    if (trashedMedia.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    // Delete physical files
    for (const media of trashedMedia) {
      try {
        const filepath = path.join(process.cwd(), 'public', media.filepath);
        await unlink(filepath);
      } catch (fileError) {
        console.error(`Error deleting file ${media.filepath}:`, fileError);
        // Continue with next file
      }
    }

    // Delete from database
    const result = await Media.deleteMany({ status: 'trash' });

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
