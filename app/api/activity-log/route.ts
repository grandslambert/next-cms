import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getSiteTable } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = (session.user as any).permissions || {};
    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    const siteId = (session.user as any).currentSiteId || 1;
    
    // Only admins can view activity logs (or users with manage_users permission)
    if (!isSuperAdmin && !permissions.manage_users) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const userId = searchParams.get('user_id');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entity_type');
    const search = searchParams.get('search');
    const filterSiteId = searchParams.get('site_id'); // For super admin site filtering

    let whereConditions = [];
    let params: any[] = [];

    // Filter by site
    if (!isSuperAdmin) {
      // Non-super admins: only see their current site (not global activities)
      whereConditions.push('al.site_id = ?');
      params.push(siteId);
    } else if (filterSiteId) {
      // Super admins: filter by specific site if selected
      if (filterSiteId === 'all') {
        // Show all activities
      } else if (filterSiteId === 'global') {
        // Show only global activities
        whereConditions.push('al.site_id IS NULL');
      } else {
        // Show specific site activities
        whereConditions.push('al.site_id = ?');
        params.push(Number.parseInt(filterSiteId));
      }
    }

    if (userId) {
      whereConditions.push('al.user_id = ?');
      params.push(userId);
    }

    if (action) {
      whereConditions.push('al.action = ?');
      params.push(action);
    }

    if (entityType) {
      whereConditions.push('al.entity_type = ?');
      params.push(entityType);
    }

    if (search) {
      whereConditions.push('(al.entity_name LIKE ? OR al.details LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count (activity_log is a global table)
    const [countResult] = await db.query<any[]>(
      `SELECT COUNT(*) as total FROM activity_log al ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get logs with user info and site name
    const [logs] = await db.query<any[]>(
      `SELECT 
        al.*,
        u.username,
        u.first_name,
        u.last_name,
        s.display_name as site_name
       FROM activity_log al
       LEFT JOIN users u ON al.user_id = u.id
       LEFT JOIN sites s ON al.site_id = s.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}

