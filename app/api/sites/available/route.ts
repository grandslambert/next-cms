import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { GlobalModels } from '@/lib/model-factory';

export async function GET(request: NextRequest) {
  try {
    const Site = await GlobalModels.Site();
    const SiteUser = await GlobalModels.SiteUser();
    
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
      const Role = await GlobalModels.Role();
      const siteAssignments = await SiteUser.find({ user_id: userId }).lean();
      
      // Manually fetch related sites and roles
      const siteIds = siteAssignments.map(a => a.site_id);
      const roleIds = siteAssignments.map(a => a.role_id);
      
      const relatedSites = await Site.find({ id: { $in: siteIds }, is_active: true }).lean() as any[];
      const relatedRoles = await Role.find({ _id: { $in: roleIds } }).lean() as any[];
      
      // Map roles by ID for quick lookup
      const rolesById = new Map(relatedRoles.map(r => [r._id.toString(), r]));
      
      sites = siteAssignments
        .map(assignment => {
          const site = relatedSites.find(s => s.id === assignment.site_id);
          if (!site) return null;
          
          const role = rolesById.get(assignment.role_id.toString());
          
          return {
            _id: site._id,
            id: site.id,
            name: site.name,
            display_name: site.display_name,
            description: site.description,
            domain: site.domain,
            is_active: site.is_active,
            role_name: role?.label || 'Unknown'
          };
        })
        .filter(s => s !== null)
        .sort((a, b) => a!.display_name.localeCompare(b!.display_name));
    }

    return NextResponse.json({ sites });
  } catch (error) {
    console.error('Error fetching available sites:', error);
    return NextResponse.json({ error: 'Failed to fetch available sites' }, { status: 500 });
  }
}

