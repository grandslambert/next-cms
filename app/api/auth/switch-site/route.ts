import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { siteId } = await request.json();

    if (!siteId || typeof siteId !== 'number') {
      return NextResponse.json({ error: 'Valid site ID is required' }, { status: 400 });
    }

    const userId = (session.user as any)?.id;
    const isSuperAdmin = (session.user as any)?.isSuperAdmin;

    // Check if site exists
    const [sites] = await db.query<RowDataPacket[]>(
      'SELECT id, name, display_name, is_active FROM sites WHERE id = ?',
      [siteId]
    );

    if (sites.length === 0) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const site = sites[0];

    if (!site.is_active) {
      return NextResponse.json({ error: 'Site is not active' }, { status: 403 });
    }

    // Super admins can access any site
    // Regular users need to have access via site_users table
    if (!isSuperAdmin) {
      const [siteUsers] = await db.query<RowDataPacket[]>(
        'SELECT id FROM site_users WHERE site_id = ? AND user_id = ?',
        [siteId, userId]
      );

      if (siteUsers.length === 0) {
        return NextResponse.json({ error: 'You do not have access to this site' }, { status: 403 });
      }
    }

    // Update session with new site ID
    // This will be picked up by the JWT callback
    return NextResponse.json({ 
      success: true,
      siteId,
      siteName: site.display_name,
      message: `Switched to ${site.display_name}`
    });
  } catch (error) {
    console.error('Error switching site:', error);
    return NextResponse.json({ error: 'Failed to switch site' }, { status: 500 });
  }
}

