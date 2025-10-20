import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { Media } from '@/lib/models';
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

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
    }

    const body = await request.json();
    const { folder_id } = body;

    if (folder_id && !mongoose.Types.ObjectId.isValid(folder_id)) {
      return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 });
    }

    await connectDB();

    const media = await Media.findByIdAndUpdate(
      params.id,
      {
        folder_id: folder_id ? new mongoose.Types.ObjectId(folder_id) : null,
      },
      { new: true }
    );

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      media: { ...media.toObject(), id: media._id.toString() } 
    });
  } catch (error) {
    console.error('Error moving media:', error);
    return NextResponse.json({ error: 'Failed to move media' }, { status: 500 });
  }
}
