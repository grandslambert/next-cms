import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { GlobalModels } from '@/lib/model-factory';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { site_id } = body;

    if (!site_id) {
      return NextResponse.json({ error: 'site_id is required' }, { status: 400 });
    }

    const siteIdNum = parseInt(site_id);
    if (!siteIdNum || isNaN(siteIdNum)) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const isSuperAdmin = (session.user as any).isSuperAdmin;

    const Site = await GlobalModels.Site();
    const SiteUser = await GlobalModels.SiteUser();

    // Verify site exists
    const site = await Site.findOne({ id: siteIdNum }).lean();
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // If not super admin, verify user has access to this site
    if (!isSuperAdmin) {
      const siteUser = await SiteUser.findOne({
        user_id: new mongoose.Types.ObjectId(userId),
        site_id: siteIdNum,
      }).lean();

      if (!siteUser) {
        return NextResponse.json({ error: 'Access denied to this site' }, { status: 403 });
      }
    }

    // Return the site_id to be updated in the session by the client
    return NextResponse.json({ 
      success: true,
      site_id: siteIdNum,
      site_name: (site as any).display_name,
      message: 'Site switched successfully',
    });
  } catch (error) {
    console.error('Error switching site:', error);
    return NextResponse.json({ error: 'Failed to switch site' }, { status: 500 });
  }
}
