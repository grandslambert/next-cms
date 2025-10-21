import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { Media } from '@/lib/models';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteId = (session.user as any).currentSiteId;

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
    }

    await connectDB();

    const media = await Media.findOne({
      _id: new mongoose.Types.ObjectId(params.id),
      site_id: new mongoose.Types.ObjectId(siteId),
    }).populate('uploaded_by', 'username email').lean();

    if (!media) {
      return NextResponse.json({ error: 'Media not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ 
      media: {
        ...media,
        id: media._id.toString(),
        mime_type: (media as any).mimetype, // Map mimetype to mime_type for frontend
        original_name: (media as any).original_filename, // Map original_filename to original_name for frontend
        url: (media as any).filepath, // Map filepath to url for frontend
        uploaded_by_name: (media.uploaded_by as any)?.username || 'Unknown',
      }
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}

export async function PUT(
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

    const body = await request.json();
    const { alt_text, caption, folder_id } = body;

    await connectDB();

    const updatedMedia = await Media.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(params.id),
        site_id: new mongoose.Types.ObjectId(siteId),
      },
      {
        alt_text: alt_text || '',
        caption: caption || '',
        folder_id: folder_id && mongoose.Types.ObjectId.isValid(folder_id) ? new mongoose.Types.ObjectId(folder_id) : null,
      },
      { new: true }
    );

    if (!updatedMedia) {
      return NextResponse.json({ error: 'Media not found or access denied' }, { status: 404 });
    }

    // Log activity
    await logActivity({
      userId,
      action: 'media_updated' as any,
      entityType: 'media' as any,
      entityId: params.id,
      entityName: updatedMedia.original_filename,
      details: `Updated media: ${updatedMedia.original_filename}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    const mediaObj = updatedMedia.toObject();
    return NextResponse.json({ 
      media: {
        ...mediaObj,
        id: updatedMedia._id.toString(),
        mime_type: mediaObj.mimetype, // Map mimetype to mime_type for frontend
        original_name: mediaObj.original_filename, // Map original_filename to original_name for frontend
        url: mediaObj.filepath, // Map filepath to url for frontend
      }
    });
  } catch (error) {
    console.error('Error updating media:', error);
    return NextResponse.json({ error: 'Failed to update media' }, { status: 500 });
  }
}

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

    const media = await Media.findOne({
      _id: new mongoose.Types.ObjectId(params.id),
      site_id: new mongoose.Types.ObjectId(siteId),
    }).lean();

    if (!media) {
      return NextResponse.json({ error: 'Media not found or access denied' }, { status: 404 });
    }

    // Move to trash (soft delete)
    await Media.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(params.id),
        site_id: new mongoose.Types.ObjectId(siteId),
      },
      {
        status: 'trash',
        deleted_at: new Date(),
      }
    );

    // Log activity
    await logActivity({
      userId,
      action: 'media_deleted' as any,
      entityType: 'media' as any,
      entityId: params.id,
      entityName: media.original_filename,
      details: `Moved media to trash: ${media.original_filename}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 });
  }
}
