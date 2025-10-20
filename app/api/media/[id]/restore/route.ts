import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { Media } from '@/lib/models';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';

export async function POST(
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

    const media = await Media.findByIdAndUpdate(
      params.id,
      {
        status: 'active',
        deleted_at: null,
      },
      { new: true }
    );

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Log activity
    await logActivity({
      userId,
      action: 'media_restored' as any,
      entityType: 'media' as any,
      entityId: params.id,
      entityName: media.original_filename,
      details: `Restored media from trash: ${media.original_filename}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ success: true, media: { ...media.toObject(), id: media._id.toString() } });
  } catch (error) {
    console.error('Error restoring media:', error);
    return NextResponse.json({ error: 'Failed to restore media' }, { status: 500 });
  }
}
