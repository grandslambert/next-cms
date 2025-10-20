import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { UserMeta } from '@/lib/models';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId;
    const body = await request.json();
    const { post_id, data } = body;

    if (!post_id || !data) {
      return NextResponse.json({ error: 'post_id and data are required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(siteId)) {
      return NextResponse.json({ error: 'Invalid user or site ID' }, { status: 400 });
    }

    await connectDB();

    // Store autosave data as user meta
    const autosaveKey = `autosave_${post_id}`;

    await UserMeta.findOneAndUpdate(
      {
        user_id: new mongoose.Types.ObjectId(userId),
        site_id: new mongoose.Types.ObjectId(siteId),
        meta_key: autosaveKey,
      },
      {
        meta_value: JSON.stringify(data),
      },
      {
        upsert: true,
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving autosave:', error);
    return NextResponse.json({ error: 'Failed to save autosave' }, { status: 500 });
  }
}
