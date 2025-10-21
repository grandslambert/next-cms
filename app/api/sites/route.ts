import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import connectDB from '@/lib/mongodb';
import { Site, SiteUser } from '@/lib/models';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import { initializeSiteDefaults } from '@/lib/init-site-defaults';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
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
      
      // Add user count and map _id to id for each site
      for (const site of sites) {
        const userCount = await SiteUser.countDocuments({ site_id: site._id });
        (site as any).user_count = userCount;
        (site as any).id = site._id.toString();
      }
    } else {
      // Get sites user is assigned to
      const siteAssignments = await SiteUser.find({ user_id: userId })
        .populate('site_id')
        .populate('role_id')
        .lean();
      
      sites = siteAssignments
        .filter(assignment => (assignment.site_id as any)?.is_active)
        .map(assignment => {
          const siteData = assignment.site_id as any;
          return {
            ...siteData,
            id: siteData._id.toString(),
            user_role_id: assignment.role_id,
            user_role_name: (assignment.role_id as any)?.name
          };
        });
    }

    return NextResponse.json({ sites });
  } catch (error) {
    console.error('Error fetching sites:', error);
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
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

    // Create site in MongoDB
    const newSite = await Site.create({
      name,
      display_name,
      domain: domain || '',
      description: description || '',
      is_active: is_active !== false,
    });

    console.log(`✓ Created site: ${display_name} (ID: ${newSite._id})`);
    
    // Initialize default data for the new site
    try {
      await initializeSiteDefaults(newSite._id);
    } catch (initError) {
      console.error('Error initializing site defaults:', initError);
      // Continue even if initialization fails - site is created
    }

    // Log activity
    const userId = (session?.user as any)?.id;
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
        id: newSite._id.toString(),
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

