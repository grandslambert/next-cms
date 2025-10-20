import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import connectDB from '@/lib/mongodb';
import { PostType } from '@/lib/models';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    const siteIdStr = (session?.user as any)?.currentSiteId;
    
    if (!siteIdStr || !mongoose.Types.ObjectId.isValid(siteIdStr)) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }
    
    const postTypes = await PostType.find({ site_id: new mongoose.Types.ObjectId(siteIdStr) })
      .sort({ menu_position: 1, name: 1 })
      .lean();

    // Transform supports array to object for UI compatibility
    const formattedPostTypes = postTypes.map((pt: any) => {
      const supportsObj: any = {};
      if (Array.isArray(pt.supports)) {
        pt.supports.forEach((feature: string) => {
          // Map array values to object properties
          if (feature === 'editor') supportsObj.content = true;
          if (feature === 'title') supportsObj.title = true;
          if (feature === 'thumbnail') supportsObj.featured_image = true;
          if (feature === 'excerpt') supportsObj.excerpt = true;
          if (feature === 'comments') supportsObj.comments = true;
          if (feature === 'custom_fields') supportsObj.custom_fields = true;
          if (feature === 'author') supportsObj.author = true;
        });
      }
      
      return {
        ...pt,
        id: pt._id.toString(),
        label: pt.labels?.plural_name || pt.name,
        singular_label: pt.labels?.singular_name || pt.name,
        hierarchical: pt.is_hierarchical,
        supports: supportsObj,
      };
    });

    return NextResponse.json({ postTypes: formattedPostTypes });
  } catch (error) {
    console.error('Error fetching post types:', error);
    return NextResponse.json({ error: 'Failed to fetch post types' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const siteIdStr = (session.user as any).currentSiteId;
    
    if (!siteIdStr || !mongoose.Types.ObjectId.isValid(siteIdStr)) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }
    
    const siteId = new mongoose.Types.ObjectId(siteIdStr);
    const body = await request.json();
    const { 
      name, 
      slug, 
      label, 
      singular_label, 
      description, 
      icon, 
      supports, 
      menu_position, 
      hierarchical,
      has_archive,
      rewrite_slug,
      taxonomies 
    } = body;

    if (!name || !label || !singular_label) {
      return NextResponse.json({ error: 'Name, label, and singular label are required' }, { status: 400 });
    }

    // Validate name format (lowercase, alphanumeric, underscores only)
    if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
      return NextResponse.json({ 
        error: 'Name must be lowercase alphanumeric with underscores only' 
      }, { status: 400 });
    }

    // Check if post type already exists
    const existing = await PostType.findOne({ site_id: siteId, name });
    if (existing) {
      return NextResponse.json({ error: 'Post type with this name already exists' }, { status: 400 });
    }

    // Create post type
    const postType = await PostType.create({
      site_id: siteId,
      name,
      slug: slug || name,
      labels: {
        singular_name: singular_label,
        plural_name: label,
        add_new: `Add New ${singular_label}`,
        edit_item: `Edit ${singular_label}`,
        view_item: `View ${singular_label}`,
      },
      description: description || '',
      is_hierarchical: hierarchical || false,
      is_public: true,
      supports: supports || ['title', 'editor'],
      menu_icon: icon || '📄',
      menu_position: menu_position || 5,
      has_archive: has_archive !== false,
      rewrite_slug: rewrite_slug || slug || name,
      taxonomies: taxonomies || [],
    });

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'post_type_created',
      entityType: 'post_type',
      entityId: postType._id.toString(),
      entityName: label,
      details: `Created post type: ${label} (${name})`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId: siteIdStr,
    });

    return NextResponse.json({ postType }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating post type:', error);
    return NextResponse.json({ error: 'Failed to create post type' }, { status: 500 });
  }
}
