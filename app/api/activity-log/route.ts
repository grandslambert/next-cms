import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import connectDB from '@/lib/mongodb';
import { ActivityLog, User, Site } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = (session.user as any).permissions || {};
    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    const siteIdStr = (session.user as any)?.currentSiteId;
    
    // Only admins can view activity logs (or users with manage_users permission)
    if (!isSuperAdmin && !permissions.manage_users) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    const userId = searchParams.get('user_id');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entity_type');
    const search = searchParams.get('search');
    const filterSiteId = searchParams.get('site_id'); // For super admin site filtering

    // Build MongoDB query
    const query: any = {};

    // Filter by site
    if (!isSuperAdmin) {
      // Non-super admins: only see their current site
      query.site_id = siteIdStr;
    } else if (filterSiteId) {
      // Super admins: filter by specific site if selected
      if (filterSiteId === 'all') {
        // Show all activities (no site filter)
      } else if (filterSiteId === 'global') {
        // Show only global activities
        query.site_id = { $exists: false };
      } else {
        // Show specific site activities
        query.site_id = filterSiteId;
      }
    }

    if (userId) {
      query.user_id = userId;
    }

    if (action) {
      query.action = action;
    }

    if (entityType) {
      query.entity_type = entityType;
    }

    if (search) {
      query.$or = [
        { entity_name: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count
    const total = await ActivityLog.countDocuments(query);

    // Get logs
    const activityLogs = await ActivityLog.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Populate user and site information
    const logs = await Promise.all(activityLogs.map(async (log: any) => {
      const user = await User.findById(log.user_id).select('username first_name last_name').lean();
      const site = log.site_id ? await Site.findById(log.site_id).select('display_name').lean() : null;
      
      return {
        ...log,
        id: log._id.toString(),
        username: user?.username,
        first_name: user?.first_name,
        last_name: user?.last_name,
        site_name: site?.display_name,
      };
    }));

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

