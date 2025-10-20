import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { Media } from '@/lib/models';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';
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

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }

    // Validate all IDs
    const invalidIds = ids.filter((id: string) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return NextResponse.json({ error: 'Invalid media IDs found' }, { status: 400 });
    }

    await connectDB();

    const objectIds = ids.map((id: string) => new mongoose.Types.ObjectId(id));

    // Get media files to delete
    const mediaFiles = await Media.find({ 
      _id: { $in: objectIds },
      status: 'trash',
    }).lean();

    if (mediaFiles.length === 0) {
      return NextResponse.json({ error: 'No media found in trash' }, { status: 404 });
    }

    // Delete physical files
    for (const media of mediaFiles) {
      try {
        const filepath = path.join(process.cwd(), 'public', media.filepath);
        await unlink(filepath);
      } catch (fileError) {
        console.error(`Error deleting file ${media.filepath}:`, fileError);
        // Continue with next file
      }
    }

    // Delete from database
    const result = await Media.deleteMany({ _id: { $in: objectIds } });

    // Log activity
    await logActivity({
      userId,
      action: 'media_bulk_permanently_deleted' as any,
      entityType: 'media' as any,
      entityId: 'multiple',
      entityName: 'Multiple media files',
      details: `Permanently deleted ${result.deletedCount} media file(s)`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    console.error('Error permanently deleting media:', error);
    return NextResponse.json({ error: 'Failed to permanently delete media' }, { status: 500 });
  }
}
