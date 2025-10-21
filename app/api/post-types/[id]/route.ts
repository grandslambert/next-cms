import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels } from '@/lib/model-factory';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(params.id)) {
      return NextResponse.json({ error: 'Invalid post type ID format' }, { status: 400 });
    }

    const siteId = (session.user as any).currentSiteId;
    
    if (!siteId) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }
    
    const PostType = await SiteModels.PostType(siteId);
    const postType = await PostType.findOne({
      _id: params.id,
    }).lean();

    if (!postType) {
      return NextResponse.json({ error: 'Post type not found' }, { status: 404 });
    }

    // Transform supports array to object for UI compatibility
    const supportsObj: any = {};
    if (Array.isArray((postType as any).supports)) {
      (postType as any).supports.forEach((feature: string) => {
        if (feature === 'editor') supportsObj.content = true;
        if (feature === 'title') supportsObj.title = true;
        if (feature === 'thumbnail') supportsObj.featured_image = true;
        if (feature === 'excerpt') supportsObj.excerpt = true;
        if (feature === 'comments') supportsObj.comments = true;
        if (feature === 'custom_fields') supportsObj.custom_fields = true;
        if (feature === 'author') supportsObj.author = true;
      });
    }

    // Transform taxonomies array to object for UI compatibility
    const taxonomiesObj: any = {};
    if (Array.isArray((postType as any).taxonomies)) {
      (postType as any).taxonomies.forEach((taxonomy: string) => {
        taxonomiesObj[taxonomy] = true;
      });
    }

    return NextResponse.json({ 
      postType: {
        ...(postType as any),
        id: (postType as any)._id.toString(),
        label: (postType as any).labels?.plural_name || (postType as any).name,
        singular_label: (postType as any).labels?.singular_name || (postType as any).name,
        hierarchical: (postType as any).is_hierarchical,
        supports: supportsObj,
        taxonomies: taxonomiesObj,
        _id: undefined,
      }
    });
  } catch (error) {
    console.error('Error fetching post type:', error);
    return NextResponse.json({ error: 'Failed to fetch post type' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const permissions = (session?.user as any)?.permissions || {};
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin || false;

    if (!session?.user || (!isSuperAdmin && !permissions.manage_post_types)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(params.id)) {
      return NextResponse.json({ error: 'Invalid post type ID format' }, { status: 400 });
    }

    const siteId = (session.user as any).currentSiteId;
    
    if (!siteId) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }
    
    const PostType = await SiteModels.PostType(siteId);
    const body = await request.json();
    const { 
      slug, 
      name,
      labels, 
      description, 
      menu_icon, 
      supports, 
      menu_position,
      show_in_dashboard,
      show_in_menu,
      is_hierarchical, 
      taxonomies,
      has_archive,
      rewrite_slug,
    } = body;

    // Get current post type BEFORE updating (for activity log)
    const currentPostType = await PostType.findOne({
      _id: params.id,
    });

    if (!currentPostType) {
      return NextResponse.json({ error: 'Post type not found' }, { status: 404 });
    }

    const isBuiltIn = currentPostType.name === 'post' || currentPostType.name === 'page';

    // Parse supports if it's a JSON string (same logic as POST)
    let parsedSupports = supports || ['title', 'editor'];
    if (typeof supports === 'string') {
      try {
        parsedSupports = JSON.parse(supports);
      } catch (e) {
        parsedSupports = ['title', 'editor'];
      }
    } else if (Array.isArray(supports)) {
      parsedSupports = supports;
    }

    // If parsedSupports is an array containing objects, extract keys from the first object
    if (Array.isArray(parsedSupports) && parsedSupports.length > 0 && typeof parsedSupports[0] === 'object') {
      parsedSupports = Object.keys(parsedSupports[0]).filter(key => parsedSupports[0][key] === true);
    }
    // If it's an object with boolean values, extract the keys where value is true
    else if (typeof parsedSupports === 'object' && !Array.isArray(parsedSupports)) {
      parsedSupports = Object.keys(parsedSupports).filter(key => parsedSupports[key] === true);
    }
    // Ensure it's an array of strings
    if (!Array.isArray(parsedSupports)) {
      parsedSupports = ['title', 'editor'];
    }
    
    // Map UI field names back to database field names
    parsedSupports = parsedSupports.map((feature: string) => {
      if (feature === 'featured_image') return 'thumbnail';
      if (feature === 'content') return 'editor';
      return feature;
    });

    // Parse taxonomies if it's a JSON string
    let parsedTaxonomies = taxonomies || [];
    if (typeof taxonomies === 'string') {
      try {
        parsedTaxonomies = JSON.parse(taxonomies);
      } catch (e) {
        parsedTaxonomies = [];
      }
    }

    // Prepare update data
    const updateData: any = {
      labels,
      description,
      menu_icon,
      supports: parsedSupports,
      menu_position,
      show_in_dashboard,
      show_in_menu,
      is_hierarchical,
      has_archive,
      rewrite_slug,
      taxonomies: parsedTaxonomies,
    };

    // Only allow slug and name changes for non-built-in types
    if (!isBuiltIn) {
      if (slug !== undefined) updateData.slug = slug;
      if (name !== undefined) updateData.name = name;
    }

    // Save current state for activity log
    const changesBefore = {
      name: currentPostType.name,
      slug: currentPostType.slug,
      labels: currentPostType.labels,
      description: currentPostType.description,
      menu_icon: currentPostType.menu_icon,
      supports: currentPostType.supports,
      show_in_dashboard: currentPostType.show_in_dashboard,
      is_hierarchical: currentPostType.is_hierarchical,
      menu_position: currentPostType.menu_position,
      taxonomies: currentPostType.taxonomies?.join(', ') || 'None',
    };

    // Update post type
    const updatedPostType = await PostType.findOneAndUpdate(
      { _id: params.id },
      { $set: updateData },
      { new: true }
    );

    if (!updatedPostType) {
      return NextResponse.json({ error: 'Failed to update post type' }, { status: 500 });
    }

    const changesAfter = {
      name: updatedPostType.name,
      slug: updatedPostType.slug,
      labels: updatedPostType.labels,
      description: updatedPostType.description,
      menu_icon: updatedPostType.menu_icon,
      supports: updatedPostType.supports,
      show_in_dashboard: updatedPostType.show_in_dashboard,
      is_hierarchical: updatedPostType.is_hierarchical,
      menu_position: updatedPostType.menu_position,
      taxonomies: updatedPostType.taxonomies?.join(', ') || 'None',
    };

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'post_type_updated',
      entityType: 'post_type',
      entityId: params.id,
      entityName: updatedPostType.labels.singular_name || updatedPostType.name,
      details: `Updated post type: ${updatedPostType.labels.singular_name || updatedPostType.name}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
      changesBefore,
      changesAfter,
    });

    return NextResponse.json({ 
      postType: {
        id: updatedPostType._id.toString(),
        ...updatedPostType.toObject(),
        _id: undefined,
      }
    });
  } catch (error) {
    console.error('Error updating post type:', error);
    return NextResponse.json({ error: 'Failed to update post type' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const permissions = (session?.user as any)?.permissions || {};
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin || false;

    if (!session?.user || (!isSuperAdmin && !permissions.manage_post_types)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(params.id)) {
      return NextResponse.json({ error: 'Invalid post type ID format' }, { status: 400 });
    }

    const siteId = (session.user as any).currentSiteId;
    
    if (!siteId) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }
    
    const PostType = await SiteModels.PostType(siteId);
    const Post = await SiteModels.Post(siteId);

    // Get post type
    const postType = await PostType.findOne({
      _id: params.id,
    });

    if (!postType) {
      return NextResponse.json({ error: 'Post type not found' }, { status: 404 });
    }

    // Check if it's a built-in post type
    if (postType.name === 'post' || postType.name === 'page') {
      return NextResponse.json({ 
        error: `Cannot delete the built-in "${postType.name}" post type` 
      }, { status: 400 });
    }

    // Check if any posts use this post type
    const postCount = await Post.countDocuments({
      post_type: postType.name,
    });

    if (postCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete post type with ${postCount} existing posts` 
      }, { status: 400 });
    }

    // Log activity before deleting
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'post_type_deleted',
      entityType: 'post_type',
      entityId: params.id,
      entityName: postType.labels.singular_name || postType.name,
      details: `Deleted post type: ${postType.labels.singular_name || postType.name} (${postType.name})`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    // Delete the post type
    await PostType.findByIdAndDelete(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post type:', error);
    return NextResponse.json({ error: 'Failed to delete post type' }, { status: 500 });
  }
}
