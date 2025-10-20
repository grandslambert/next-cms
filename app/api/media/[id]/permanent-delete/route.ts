import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { Media } from '@/lib/models';
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

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
    }

    await connectDB();

    const media = await Media.findById(params.id).lean();

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    if (media.status !== 'trash') {
      return NextResponse.json({ error: 'Media must be in trash before permanent deletion' }, { status: 400 });
    }

    // Delete physical file
    try {
      const filepath = path.join(process.cwd(), 'public', media.filepath);
      await unlink(filepath);
    } catch (fileError) {
      console.error('Error deleting physical file:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await Media.findByIdAndDelete(params.id);

    // Log activity
    await logActivity({
      userId,
      action: 'media_permanently_deleted' as any,
      entityType: 'media' as any,
      entityId: params.id,
      entityName: media.original_filename,
      details: `Permanently deleted media: ${media.original_filename}`,
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
