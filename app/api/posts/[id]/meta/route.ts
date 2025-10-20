import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { PostMeta } from '@/lib/models';
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

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    await connectDB();

    const meta = await PostMeta.find({ post_id: new mongoose.Types.ObjectId(params.id) }).lean();

    // Format for UI compatibility
    const formattedMeta = meta.map((m) => ({
      ...m,
      id: m._id.toString(),
    }));

    return NextResponse.json({ meta: formattedMeta });
  } catch (error) {
    console.error('Error fetching post meta:', error);
    return NextResponse.json({ error: 'Failed to fetch post meta' }, { status: 500 });
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

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    const body = await request.json();
    const { meta_key, meta_value } = body;

    if (!meta_key) {
      return NextResponse.json({ error: 'meta_key is required' }, { status: 400 });
    }

    await connectDB();

    // Upsert meta value
    const updatedMeta = await PostMeta.findOneAndUpdate(
      {
        post_id: new mongoose.Types.ObjectId(params.id),
        meta_key,
      },
      {
        meta_value: meta_value || '',
      },
      {
        upsert: true,
        new: true,
      }
    );

    return NextResponse.json({
      success: true,
      meta: {
        ...updatedMeta.toObject(),
        id: updatedMeta._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error updating post meta:', error);
    return NextResponse.json({ error: 'Failed to update post meta' }, { status: 500 });
  }
}
