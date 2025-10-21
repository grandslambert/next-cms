import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels } from '@/lib/model-factory';
import mongoose from 'mongoose';

export async function PUT(
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
      return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, parent_id } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (parent_id && !mongoose.Types.ObjectId.isValid(parent_id)) {
      return NextResponse.json({ error: 'Invalid parent folder ID' }, { status: 400 });
    }

    const MediaFolder = await SiteModels.MediaFolder(siteId);
    const folder = await MediaFolder.findByIdAndUpdate(
      params.id,
      {
        name,
        parent_id: parent_id ? new mongoose.Types.ObjectId(parent_id) : null,
      },
      { new: true }
    );

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      folder: { ...folder.toObject(), id: folder._id.toString() } 
    });
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
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

    const siteId = (session.user as any).currentSiteId;

    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 });
    }

    const Media = await SiteModels.Media(siteId);
    const MediaFolder = await SiteModels.MediaFolder(siteId);

    // Check if folder has media
    const mediaCount = await Media.countDocuments({ folder_id: new mongoose.Types.ObjectId(params.id) });
    
    if (mediaCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete folder with media. Move or delete media first.' 
      }, { status: 400 });
    }

    // Check if folder has subfolders
    const subfolderCount = await MediaFolder.countDocuments({ parent_id: new mongoose.Types.ObjectId(params.id) });
    
    if (subfolderCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete folder with subfolders. Delete subfolders first.' 
      }, { status: 400 });
    }

    await MediaFolder.findByIdAndDelete(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
