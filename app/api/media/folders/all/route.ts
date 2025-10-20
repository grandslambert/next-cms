import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { MediaFolder } from '@/lib/models';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteId = (session.user as any).currentSiteId;

    if (!siteId || !mongoose.Types.ObjectId.isValid(siteId)) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }

    await connectDB();

    const folders = await MediaFolder.find({ site_id: new mongoose.Types.ObjectId(siteId) })
      .sort({ name: 1 })
      .lean();

    const formattedFolders = folders.map((f) => ({
      ...f,
      id: f._id.toString(),
    }));

    return NextResponse.json({ folders: formattedFolders });
  } catch (error) {
    console.error('Error fetching all folders:', error);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}
