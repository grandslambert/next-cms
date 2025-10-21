import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels } from '@/lib/model-factory';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteId = (session.user as any).currentSiteId;
    const searchParams = request.nextUrl.searchParams;
    const parentId = searchParams.get('parent_id');

    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    const MediaFolder = await SiteModels.MediaFolder(siteId);
    const Media = await SiteModels.Media(siteId);

    // Build query - filter by parent_id if provided
    const query: any = {};
    
    if (parentId === 'null' || parentId === null || parentId === '') {
      // Root level - folders with no parent
      query.parent_id = null;
    } else if (mongoose.Types.ObjectId.isValid(parentId)) {
      // Subfolders of a specific folder
      query.parent_id = new mongoose.Types.ObjectId(parentId);
    } else {
      // Invalid parent_id
      query.parent_id = null;
    }

    const folders = await MediaFolder.find(query)
      .sort({ name: 1 })
      .lean();
    
    const formattedFolders = await Promise.all((folders as any[]).map(async (f: any) => {
      // Count media files in this folder
      const fileCount = await Media.countDocuments({
        folder_id: f._id,
        status: 'active',
      });

      // Count subfolders
      const subfolderCount = await MediaFolder.countDocuments({
        parent_id: f._id,
      });

      return {
        ...f,
        id: f._id.toString(),
        file_count: fileCount,
        subfolder_count: subfolderCount,
      };
    }));

    return NextResponse.json({ folders: formattedFolders });
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteId = (session.user as any).currentSiteId;
    const body = await request.json();
    const { name, parent_id } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    const MediaFolder = await SiteModels.MediaFolder(siteId);

    const newFolder = await MediaFolder.create({
      name,
      parent_id: parent_id && mongoose.Types.ObjectId.isValid(parent_id) ? new mongoose.Types.ObjectId(parent_id) : null,
    });

    return NextResponse.json({ 
      folder: {
        ...newFolder.toObject(),
        id: newFolder._id.toString(),
      }
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}
