import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { GlobalModels } from '@/lib/model-factory';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const Site = await GlobalModels.Site();
    const SiteUser = await GlobalModels.SiteUser();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteId = parseInt(params.id);
    const site = await Site.findOne({ id: siteId }).lean();

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Add user count
    const userCount = await SiteUser.countDocuments({ site_id: (site as any).id });
    (site as any).user_count = userCount;

    return NextResponse.json({ site });
  } catch (error) {
    console.error('Error fetching site:', error);
    return NextResponse.json({ error: 'Failed to fetch site' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const Site = await GlobalModels.Site();
    
    const session = await getServerSession(authOptions);
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin;

    // Only super admins can update sites
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    // Get site data before update
    const siteId = parseInt(params.id);
    const site = await Site.findOne({ id: siteId });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const beforeData = site.toObject();
    const body = await request.json();
    const { name, display_name, domain, description, is_active } = body;

    if (!display_name) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    // Note: name is typically immutable after creation in MongoDB
    // Updating the name would require renaming all collection prefixes

    // Update site
    site.display_name = display_name;
    if (domain !== undefined) site.domain = domain;
    if (description !== undefined) site.description = description;
    if (is_active !== undefined) site.is_active = is_active;
    
    await site.save();

    // Log activity
    const userId = (session?.user as any)?.id;
    await logActivity({
      userId,
      action: 'site_updated',
      entityType: 'site',
      entityId: site.id.toString(),
      entityName: display_name,
      details: `Updated site: ${display_name} (${site.name})`,
      changesBefore: { 
        name: beforeData.name, 
        display_name: beforeData.display_name,
        domain: beforeData.domain,
        description: beforeData.description,
        is_active: beforeData.is_active
      },
      changesAfter: { 
        name: site.name, 
        display_name: site.display_name,
        domain: site.domain,
        description: site.description,
        is_active: site.is_active
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ 
      success: true,
      site: {
        id: site._id.toString(),
        name: site.name,
        display_name: site.display_name,
        domain: site.domain,
        description: site.description,
        is_active: site.is_active
      }
    });
  } catch (error) {
    console.error('Error updating site:', error);
    return NextResponse.json({ error: 'Failed to update site' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const Site = await GlobalModels.Site();
    const SiteUser = await GlobalModels.SiteUser();
    
    const session = await getServerSession(authOptions);
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin;

    // Only super admins can delete sites
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    // Get site data before deletion
    const siteId = parseInt(params.id);
    const site = await Site.findOne({ id: siteId });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Prevent deletion of first/default site
    const firstSite = await Site.findOne().sort({ id: 1 });
    if (firstSite && site.id === firstSite.id) {
      return NextResponse.json({ 
        error: 'Cannot delete the first/default site' 
      }, { status: 403 });
    }

    // Delete the site
    await Site.deleteOne({ id: siteId });

    // Log activity
    const userId = (session?.user as any)?.id;
    await logActivity({
      userId,
      action: 'site_deleted',
      entityType: 'site',
      entityId: site.id.toString(),
      entityName: site.display_name,
      details: `Deleted site: ${site.display_name} (${site.name})`,
      changesBefore: { 
        name: site.name, 
        display_name: site.display_name 
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ 
      success: true,
      message: 'Site deleted successfully',
      warning: `Note: Database nextcms_site${site.id} must be manually dropped if needed`
    });
  } catch (error) {
    console.error('Error deleting site:', error);
    return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 });
  }
}
