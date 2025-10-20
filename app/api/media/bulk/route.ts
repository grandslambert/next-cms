import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { Media } from '@/lib/models';
import mongoose from 'mongoose';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids, action, folder_id } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    // Validate all IDs
    const invalidIds = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return NextResponse.json({ error: 'Invalid media IDs found' }, { status: 400 });
    }

    await connectDB();

    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));

    let result;
    switch (action) {
      case 'delete':
        result = await Media.updateMany(
          { _id: { $in: objectIds } },
          { status: 'trash', deleted_at: new Date() }
        );
        break;

      case 'move':
        if (folder_id !== null && folder_id !== undefined && !mongoose.Types.ObjectId.isValid(folder_id)) {
          return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 });
        }
        result = await Media.updateMany(
          { _id: { $in: objectIds } },
          { folder_id: folder_id ? new mongoose.Types.ObjectId(folder_id) : null }
        );
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, modified: result.modifiedCount });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    return NextResponse.json({ error: 'Failed to perform bulk action' }, { status: 500 });
  }
}
