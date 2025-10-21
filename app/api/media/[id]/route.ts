import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels } from '@/lib/model-factory';
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

    return NextResponse.json({ 
      media: {
        ...(media as any),
        id: (media as any)._id.toString(),
        title: (media as any).caption || '', // Map caption to title for frontend
        mime_type: (media as any).mimetype,
        original_name: (media as any).original_filename,
        url: (media as any).filepath,
        uploaded_by_name: 'Unknown', // TODO: Fetch from GlobalModels.User()
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

    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
    }

    const body = await request.json();
    const { title, alt_text, caption, folder_id } = body;

    const Media = await SiteModels.Media(siteId);
    
    // Build update object - only include folder_id if explicitly provided
    const updateData: any = {
      alt_text: alt_text || '',
      caption: title || caption || '', // Accept title from frontend, map to caption
    };

    // Only update folder_id if it's explicitly provided in the request
    if (folder_id !== undefined) {
      updateData.folder_id = folder_id && mongoose.Types.ObjectId.isValid(folder_id) ? new mongoose.Types.ObjectId(folder_id) : null;
    }

    const updatedMedia = await Media.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    );

    if (!updatedMedia) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
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
        title: mediaObj.caption || '', // Map caption to title for frontend
        mime_type: mediaObj.mimetype,
        original_name: mediaObj.original_filename,
        url: mediaObj.filepath,
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

    // Move to trash (soft delete)
    await Media.findByIdAndUpdate(params.id, {
      status: 'trash',
      deleted_at: new Date(),
    });

    // Log activity
    await logActivity({
      userId,
      action: 'media_deleted' as any,
      entityType: 'media' as any,
      entityId: params.id,
      entityName: (media as any).original_filename,
      details: `Moved media to trash: ${(media as any).original_filename}`,
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
