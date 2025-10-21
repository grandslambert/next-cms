import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { GlobalModels } from '@/lib/model-factory';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const UserMeta = await GlobalModels.UserMeta();

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId; // This is a Number
    const searchParams = request.nextUrl.searchParams;
    const metaKey = searchParams.get('key');

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const query: any = { user_id: new mongoose.Types.ObjectId(userId) };

    // Add site_id to query if available (site_id is Number, not ObjectId)
    if (siteId) {
      query.site_id = parseInt(siteId);
    }

    // Add meta_key to query if provided
    if (metaKey) {
      query.meta_key = metaKey;
    }

    const meta = await UserMeta.find(query).lean();

    // If requesting a specific key, return just that value
    if (metaKey && meta.length > 0) {
      return NextResponse.json({ meta_key: meta[0].meta_key, meta_value: meta[0].meta_value });
    }

    return NextResponse.json({ meta });
  } catch (error) {
    console.error('Error fetching user meta:', error);
    return NextResponse.json({ error: 'Failed to fetch user meta' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const UserMeta = await GlobalModels.UserMeta();

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId; // Number
    const body = await request.json();
    const { meta_key, meta_value } = body;

    if (!meta_key) {
      return NextResponse.json({ error: 'meta_key is required' }, { status: 400 });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (!siteId) {
      return NextResponse.json({ error: 'Invalid or missing site ID' }, { status: 400 });
    }

    // Use findOneAndUpdate with upsert to either update or insert
    const updatedMeta = await UserMeta.findOneAndUpdate(
      {
        user_id: new mongoose.Types.ObjectId(userId),
        site_id: parseInt(siteId), // Number, not ObjectId
        meta_key,
      },
      {
        meta_value,
      },
      {
        upsert: true,
        new: true,
      }
    );

    return NextResponse.json({ success: true, meta_key, meta_value });
  } catch (error) {
    console.error('Error updating user meta:', error);
    return NextResponse.json({ error: 'Failed to update user meta' }, { status: 500 });
  }
}

