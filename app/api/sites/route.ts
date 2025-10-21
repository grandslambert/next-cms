import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { GlobalModels } from '@/lib/model-factory';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import { initializeSiteDefaults } from '@/lib/init-site-defaults';

export async function GET(request: NextRequest) {
  try {
    // Get global models
    const Site = await GlobalModels.Site();
    const SiteUser = await GlobalModels.SiteUser();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin;
    const userId = (session.user as any)?.id;

    let sites;

    // Super admins see all sites, others only see sites they're assigned to
    if (isSuperAdmin) {
      sites = await Site.find().sort({ created_at: -1 }).lean();
      
      // Add user count for each site
      for (const site of sites) {
        const userCount = await SiteUser.countDocuments({ site_id: (site as any).id });
        (site as any).user_count = userCount;
      }
    } else {
      // Get sites user is assigned to
      const Role = await GlobalModels.Role();
      const siteAssignments = await SiteUser.find({ user_id: userId }).lean();
      
      // Manually fetch related sites and roles
      const siteIds = siteAssignments.map(a => a.site_id);
      const roleIds = siteAssignments.map(a => a.role_id);
      
      const relatedSites = await Site.find({ id: { $in: siteIds }, is_active: true }).lean();
      const relatedRoles = await Role.find({ _id: { $in: roleIds } }).lean();
      
      // Map by ID for quick lookup
      const sitesById = new Map(relatedSites.map((s: any) => [s.id.toString(), s]));
      const rolesById = new Map(relatedRoles.map((r: any) => [r._id.toString(), r]));
      
      sites = siteAssignments
        .map(assignment => {
          const site = sitesById.get(assignment.site_id.toString());
          if (!site) return null;
          
          const role = rolesById.get(assignment.role_id.toString());
          
          return {
            ...site,
            user_role_id: assignment.role_id,
            user_role_name: role?.name || 'Unknown'
          };
        })
        .filter(s => s !== null);
    }

    return NextResponse.json({ sites });
  } catch (error) {
    console.error('Error fetching sites:', error);
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get global model
    const Site = await GlobalModels.Site();
    
    const session = await getServerSession(authOptions);
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin;

    // Only super admins can create sites
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { name, display_name, domain, description, is_active } = body;

    if (!name || !display_name) {
      return NextResponse.json({ error: 'Name and display name are required' }, { status: 400 });
    }

    // Validate name (alphanumeric and underscores only)
    if (!/^[a-z0-9_]+$/.test(name)) {
      return NextResponse.json({ 
        error: 'Name must contain only lowercase letters, numbers, and underscores' 
      }, { status: 400 });
    }

    // Check if name already exists
    const existing = await Site.findOne({ name });
    if (existing) {
      return NextResponse.json({ error: 'Site name already exists' }, { status: 400 });
    }

    // Get the next available ID
    const lastSite = await Site.findOne({}).sort({ id: -1 }).limit(1);
    const nextId = lastSite ? lastSite.id + 1 : 1;

    // Create site in MongoDB with explicit ID
    const newSite = await Site.create({
      id: nextId,
      name,
      display_name,
      domain: domain || '',
      description: description || '',
      is_active: is_active !== false,
    });

    
    // Get user ID for default content
    const userId = (session?.user as any)?.id;
    
    // Initialize default data for the new site database
    try {
      await initializeSiteDefaults(newSite.id, userId);
    } catch (initError) {
      console.error('Error initializing site defaults:', initError);
      // Continue even if initialization fails - site is created
    }

    // Log activity
    await logActivity({
      userId,
      action: 'site_created',
      entityType: 'site',
      entityId: newSite._id.toString(),
      entityName: display_name,
      details: `Created site: ${display_name} (${name})`,
      changesAfter: { name, display_name, domain, description, is_active },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ 
      success: true, 
      site: {
        id: newSite.id,
        name: newSite.name,
        display_name: newSite.display_name,
        domain: newSite.domain,
        description: newSite.description,
        is_active: newSite.is_active
      }
    });
  } catch (error) {
    console.error('Error creating site:', error);
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
  }
}

