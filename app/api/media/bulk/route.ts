import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { Media } from '@/lib/models';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { media_ids, action, folder_id } = body;

    if (!media_ids || !Array.isArray(media_ids) || media_ids.length === 0) {
      return NextResponse.json({ error: 'media_ids array is required' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    // Validate all IDs
    const invalidIds = media_ids.filter((id: string) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return NextResponse.json({ error: 'Invalid media IDs found' }, { status: 400 });
    }

    const siteId = (session.user as any).currentSiteId;

    await connectDB();

    const objectIds = media_ids.map((id: string) => new mongoose.Types.ObjectId(id));

    let result;
    let message = '';

    switch (action) {
      case 'trash':
      case 'delete':
        result = await Media.updateMany(
          { 
            _id: { $in: objectIds },
            site_id: new mongoose.Types.ObjectId(siteId)
          },
          { status: 'trash', deleted_at: new Date() }
        );
        message = `Moved ${result.modifiedCount} item${result.modifiedCount !== 1 ? 's' : ''} to trash`;
        break;

      case 'move':
        if (folder_id !== null && folder_id !== undefined && folder_id !== '' && !mongoose.Types.ObjectId.isValid(folder_id)) {
          return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 });
        }
        result = await Media.updateMany(
          { 
            _id: { $in: objectIds },
            site_id: new mongoose.Types.ObjectId(siteId)
          },
          { folder_id: (folder_id && folder_id !== 'null') ? new mongoose.Types.ObjectId(folder_id) : null }
        );
        message = `Moved ${result.modifiedCount} item${result.modifiedCount !== 1 ? 's' : ''}`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, modified: result.modifiedCount, message });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    return NextResponse.json({ error: 'Failed to perform bulk action' }, { status: 500 });
  }
}
