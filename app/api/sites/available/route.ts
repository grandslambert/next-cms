import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import connectDB from '@/lib/mongodb';
import { Site, SiteUser } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const isSuperAdmin = (session.user as any)?.isSuperAdmin;

    let sites: any[] = [];

    if (isSuperAdmin) {
      // Super admins can access all active sites
      sites = await Site.find({ is_active: true })
        .select('_id name display_name description domain is_active')
        .sort({ display_name: 1 })
        .lean();
    } else {
      // Regular users can only access sites they're assigned to
      const siteAssignments = await SiteUser.find({ user_id: userId })
        .populate('site_id')
        .populate('role_id')
        .lean();
      
      sites = siteAssignments
        .filter(assignment => (assignment.site_id as any)?.is_active)
        .map(assignment => ({
          _id: (assignment.site_id as any)._id,
          name: (assignment.site_id as any).name,
          display_name: (assignment.site_id as any).display_name,
          description: (assignment.site_id as any).description,
          domain: (assignment.site_id as any).domain,
          is_active: (assignment.site_id as any).is_active,
          role_name: (assignment.role_id as any)?.label
        }))
        .sort((a, b) => a.display_name.localeCompare(b.display_name));
    }

    return NextResponse.json({ sites });
  } catch (error) {
    console.error('Error fetching available sites:', error);
    return NextResponse.json({ error: 'Failed to fetch available sites' }, { status: 500 });
  }
}

