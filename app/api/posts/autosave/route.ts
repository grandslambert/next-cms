import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-mongo';
import { GlobalModels } from '@/lib/model-factory';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.error('Autosave GET: Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId;
    const searchParams = request.nextUrl.searchParams;
    const post_id = searchParams.get('post_id');

    if (!post_id) {
      console.error('Autosave GET: post_id is required');
      return NextResponse.json({ error: 'post_id is required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Autosave GET: Invalid user ID', userId);
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (!siteId) {
      console.error('Autosave GET: No site context');
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    const UserMeta = await GlobalModels.UserMeta();

    // Retrieve autosave data from user meta
    const autosaveKey = `autosave_${post_id}`;

    const metaDoc = await UserMeta.findOne({
      user_id: new mongoose.Types.ObjectId(userId),
      site_id: siteId,
      meta_key: autosaveKey,
    }).lean();

    if (!metaDoc) {
      return NextResponse.json({ autosave: null });
    }

    try {
      const data = JSON.parse((metaDoc as any).meta_value);
      return NextResponse.json({ autosave: data });
    } catch (e) {
      console.error('Autosave GET: Failed to parse autosave data', e);
      return NextResponse.json({ autosave: null });
    }
  } catch (error) {
    console.error('Error retrieving autosave:', error);
    return NextResponse.json({ error: 'Failed to retrieve autosave' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.error('Autosave POST: Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId;
    const body = await request.json();
    const { post_id, data, ...restData } = body;

    // Support both formats:
    // 1. { post_id, data: {...} } - nested format
    // 2. { post_id, title, content, ... } - flat format
    const autosaveData = data || restData;

    if (!post_id) {
      console.error('Autosave POST: post_id is required');
      return NextResponse.json({ error: 'post_id is required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Autosave POST: Invalid user ID', userId);
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (!siteId) {
      console.error('Autosave POST: No site context');
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    const UserMeta = await GlobalModels.UserMeta();

    // Store autosave data as user meta with timestamp
    const autosaveKey = `autosave_${post_id}`;
    const autosaveWithTimestamp = {
      ...autosaveData,
      saved_at: new Date().toISOString(),
    };

    await UserMeta.findOneAndUpdate(
      {
        user_id: new mongoose.Types.ObjectId(userId),
        site_id: siteId, // Number, not ObjectId
        meta_key: autosaveKey,
      },
      {
        meta_value: JSON.stringify(autosaveWithTimestamp),
      },
      {
        upsert: true,
      }
    );

    return NextResponse.json({ success: true, saved_at: autosaveWithTimestamp.saved_at });
  } catch (error) {
    console.error('Error saving autosave:', error);
    return NextResponse.json({ error: 'Failed to save autosave' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.error('Autosave DELETE: Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId;
    const searchParams = request.nextUrl.searchParams;
    const post_id = searchParams.get('post_id');

    if (!post_id) {
      console.error('Autosave DELETE: post_id is required');
      return NextResponse.json({ error: 'post_id is required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Autosave DELETE: Invalid user ID', userId);
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (!siteId) {
      console.error('Autosave DELETE: No site context');
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    const UserMeta = await GlobalModels.UserMeta();

    // Delete autosave data from user meta
    const autosaveKey = `autosave_${post_id}`;

    await UserMeta.deleteOne({
      user_id: new mongoose.Types.ObjectId(userId),
      site_id: siteId,
      meta_key: autosaveKey,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting autosave:', error);
    return NextResponse.json({ error: 'Failed to delete autosave' }, { status: 500 });
  }
}
