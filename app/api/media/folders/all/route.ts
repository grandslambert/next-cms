import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels } from '@/lib/model-factory';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteId = (session.user as any).currentSiteId;

    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    const MediaFolder = await SiteModels.MediaFolder(siteId);
    const folders = await MediaFolder.find({})
      .sort({ name: 1 })
      .lean();

    const formattedFolders = (folders as any[]).map((f: any) => ({
      ...f,
      id: f._id.toString(),
    }));

    return NextResponse.json({ folders: formattedFolders });
  } catch (error) {
    console.error('Error fetching all folders:', error);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}
