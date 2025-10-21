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
      return NextResponse.json({ error: 'Invalid taxonomy ID format' }, { status: 400 });
    }

    const siteId = (session.user as any).currentSiteId;
    
    if (!siteId) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }
    
    const Taxonomy = await SiteModels.Taxonomy(siteId);
    const taxonomy = await Taxonomy.findOne({
      _id: params.id,
    }).lean();

    if (!taxonomy) {
      return NextResponse.json({ error: 'Taxonomy not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      taxonomy: {
        ...(taxonomy as any),
        id: (taxonomy as any)._id.toString(),
        label: (taxonomy as any).labels?.plural_name || (taxonomy as any).name,
        singular_label: (taxonomy as any).labels?.singular_name || (taxonomy as any).name,
        hierarchical: (taxonomy as any).is_hierarchical,
        _id: undefined,
      }
    });
  } catch (error) {
    console.error('Error fetching taxonomy:', error);
    return NextResponse.json({ error: 'Failed to fetch taxonomy' }, { status: 500 });
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

    if (!session?.user || (!isSuperAdmin && !permissions.manage_taxonomies)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(params.id)) {
      return NextResponse.json({ error: 'Invalid taxonomy ID format' }, { status: 400 });
    }

    const siteId = (session.user as any).currentSiteId;
    
    if (!siteId) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }
    
    const Taxonomy = await SiteModels.Taxonomy(siteId);
    const body = await request.json();
    
    let { 
      name,
      slug,
      label, 
      singular_label, 
      description, 
      is_hierarchical,
      is_public,
      show_in_dashboard,
      show_in_menu,
      menu_position,
      post_types,
      rewrite_slug,
    } = body;
    
    // Ensure menu_position is a number
    if (menu_position !== undefined && menu_position !== null) {
      menu_position = typeof menu_position === 'string' ? parseInt(menu_position) : menu_position;
    }

    // Get current taxonomy BEFORE updating (for activity log)
    const currentTaxonomy = await Taxonomy.findOne({
      _id: params.id,
    });

    if (!currentTaxonomy) {
      return NextResponse.json({ error: 'Taxonomy not found' }, { status: 404 });
    }

    const isBuiltIn = currentTaxonomy.name === 'category' || currentTaxonomy.name === 'tag';

    // Prepare update data
    const updateData: any = {
      labels: {
        singular_name: singular_label,
        plural_name: label,
        all_items: `All ${label}`,
        edit_item: `Edit ${singular_label}`,
        add_new_item: `Add New ${singular_label}`,
      },
      description,
      is_hierarchical,
      is_public,
      show_in_dashboard,
      show_in_menu,
      menu_position,
      post_types: post_types || [],
      rewrite_slug: rewrite_slug || slug || name,
    };

    // Only allow slug and name changes for non-built-in types
    if (!isBuiltIn) {
      if (slug !== undefined) updateData.slug = slug;
      if (name !== undefined) updateData.name = name;
    }

    // Save current state for activity log
    const changesBefore = {
      name: currentTaxonomy.name,
      slug: currentTaxonomy.slug,
      labels: currentTaxonomy.labels,
      description: currentTaxonomy.description,
      is_hierarchical: currentTaxonomy.is_hierarchical,
      show_in_dashboard: currentTaxonomy.show_in_dashboard,
      show_in_menu: currentTaxonomy.show_in_menu,
      post_types: currentTaxonomy.post_types?.join(', ') || 'None',
    };

    // Update taxonomy
    const updatedTaxonomy = await Taxonomy.findOneAndUpdate(
      { _id: params.id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedTaxonomy) {
      return NextResponse.json({ error: 'Failed to update taxonomy' }, { status: 500 });
    }

    const changesAfter = {
      name: updatedTaxonomy.name,
      slug: updatedTaxonomy.slug,
      labels: updatedTaxonomy.labels,
      description: updatedTaxonomy.description,
      is_hierarchical: updatedTaxonomy.is_hierarchical,
      show_in_dashboard: updatedTaxonomy.show_in_dashboard,
      show_in_menu: updatedTaxonomy.show_in_menu,
      post_types: updatedTaxonomy.post_types?.join(', ') || 'None',
    };

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'taxonomy_updated',
      entityType: 'taxonomy',
      entityId: params.id,
      entityName: updatedTaxonomy.labels.singular_name || updatedTaxonomy.name,
      details: `Updated taxonomy: ${updatedTaxonomy.labels.singular_name || updatedTaxonomy.name}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
      changesBefore,
      changesAfter,
    });

    return NextResponse.json({ 
      taxonomy: {
        id: updatedTaxonomy._id.toString(),
        ...updatedTaxonomy.toObject(),
        label: updatedTaxonomy.labels.plural_name,
        singular_label: updatedTaxonomy.labels.singular_name,
        hierarchical: updatedTaxonomy.is_hierarchical,
        _id: undefined,
      }
    });
  } catch (error) {
    console.error('Error updating taxonomy:', error);
    return NextResponse.json({ error: 'Failed to update taxonomy' }, { status: 500 });
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

    if (!session?.user || (!isSuperAdmin && !permissions.manage_taxonomies)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(params.id)) {
      return NextResponse.json({ error: 'Invalid taxonomy ID format' }, { status: 400 });
    }

    const siteId = (session.user as any).currentSiteId;
    
    if (!siteId) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }
    
    const Taxonomy = await SiteModels.Taxonomy(siteId);
    const Term = await SiteModels.Term(siteId);

    // Get taxonomy
    const taxonomy = await Taxonomy.findOne({
      _id: params.id,
    });

    if (!taxonomy) {
      return NextResponse.json({ error: 'Taxonomy not found' }, { status: 404 });
    }

    // Check if it's a built-in taxonomy
    if (taxonomy.name === 'category' || taxonomy.name === 'tag') {
      return NextResponse.json({ 
        error: `Cannot delete the built-in "${taxonomy.name}" taxonomy` 
      }, { status: 400 });
    }

    // Check if any terms use this taxonomy
    const termCount = await Term.countDocuments({
      taxonomy: taxonomy.name,
    });

    if (termCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete taxonomy with ${termCount} existing terms` 
      }, { status: 400 });
    }

    // Log activity before deleting
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'taxonomy_deleted',
      entityType: 'taxonomy',
      entityId: params.id,
      entityName: taxonomy.labels.singular_name || taxonomy.name,
      details: `Deleted taxonomy: ${taxonomy.labels.singular_name || taxonomy.name} (${taxonomy.name})`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    // Delete the taxonomy
    await Taxonomy.findByIdAndDelete(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting taxonomy:', error);
    return NextResponse.json({ error: 'Failed to delete taxonomy' }, { status: 500 });
  }
}
