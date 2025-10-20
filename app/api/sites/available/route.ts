import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const isSuperAdmin = (session.user as any)?.isSuperAdmin;

    let sites: RowDataPacket[] = [];

    if (isSuperAdmin) {
      // Super admins can access all active sites
      const [allSites] = await db.query<RowDataPacket[]>(
        'SELECT id, name, display_name, description, domain, is_active FROM sites WHERE is_active = 1 ORDER BY display_name ASC'
      );
      sites = allSites;
    } else {
      // Regular users can only access sites they're assigned to
      const [userSites] = await db.query<RowDataPacket[]>(
        `SELECT s.id, s.name, s.display_name, s.description, s.domain, s.is_active, r.display_name as role_name
         FROM sites s
         INNER JOIN site_users su ON s.id = su.site_id
         INNER JOIN roles r ON su.role_id = r.id
         WHERE su.user_id = ? AND s.is_active = 1
         ORDER BY s.display_name ASC`,
        [userId]
      );
      sites = userSites;
    }

    return NextResponse.json({ sites });
  } catch (error) {
    console.error('Error fetching available sites:', error);
    return NextResponse.json({ error: 'Failed to fetch available sites' }, { status: 500 });
  }
}

