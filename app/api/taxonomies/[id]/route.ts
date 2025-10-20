import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import connectDB from '@/lib/mongodb';
import { Taxonomy, Term } from '@/lib/models';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(params.id)) {
      return NextResponse.json({ error: 'Invalid taxonomy ID format' }, { status: 400 });
    }

    const siteId = (session.user as any).currentSiteId;
    
    const taxonomy = await Taxonomy.findOne({
      _id: params.id,
      site_id: siteId,
    }).lean();

    if (!taxonomy) {
      return NextResponse.json({ error: 'Taxonomy not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      taxonomy: {
        id: taxonomy._id.toString(),
        ...taxonomy,
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
    await connectDB();
    
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

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId;

    const body = await request.json();
    const { labels, description, is_hierarchical, show_in_dashboard, post_types } = body;

    // Get current taxonomy BEFORE updating (for activity log)
    const currentTaxonomy = await Taxonomy.findOne({
      _id: params.id,
      site_id: siteId,
    });

    if (!currentTaxonomy) {
      return NextResponse.json({ error: 'Taxonomy not found' }, { status: 404 });
    }

    // Prepare before/after changes
    const changesBefore = {
      labels: currentTaxonomy.labels,
      description: currentTaxonomy.description,
      is_hierarchical: currentTaxonomy.is_hierarchical,
      show_in_dashboard: currentTaxonomy.show_in_dashboard,
      post_types: currentTaxonomy.post_types?.join(', ') || 'None',
    };

    // Update taxonomy
    const updatedTaxonomy = await Taxonomy.findOneAndUpdate(
      { _id: params.id, site_id: siteId },
      { 
        $set: { 
          labels,
          description: description || '',
          is_hierarchical: is_hierarchical || false,
          show_in_dashboard: show_in_dashboard !== false,
          post_types: post_types || [],
        }
      },
      { new: true }
    );

    if (!updatedTaxonomy) {
      return NextResponse.json({ error: 'Failed to update taxonomy' }, { status: 500 });
    }

    const changesAfter = {
      labels: updatedTaxonomy.labels,
      description: updatedTaxonomy.description,
      is_hierarchical: updatedTaxonomy.is_hierarchical,
      show_in_dashboard: updatedTaxonomy.show_in_dashboard,
      post_types: updatedTaxonomy.post_types?.join(', ') || 'None',
    };

    // Log activity
    await logActivity({
      userId,
      action: 'taxonomy_updated',
      entityType: 'taxonomy',
      entityId: params.id,
      entityName: updatedTaxonomy.labels.singular_name || updatedTaxonomy.name,
      details: `Updated taxonomy: ${updatedTaxonomy.labels.singular_name || updatedTaxonomy.name}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      changesBefore,
      changesAfter,
      siteId,
    });

    return NextResponse.json({ 
      taxonomy: {
        id: updatedTaxonomy._id.toString(),
        ...updatedTaxonomy.toObject(),
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
    await connectDB();
    
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

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId;

    // Get taxonomy
    const taxonomy = await Taxonomy.findOne({
      _id: params.id,
      site_id: siteId,
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
      site_id: siteId,
      taxonomy: taxonomy.name,
    });

    if (termCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete taxonomy "${taxonomy.name}" because it has ${termCount} associated terms.` 
      }, { status: 400 });
    }

    // Log activity before deleting
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
