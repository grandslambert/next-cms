import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels } from '@/lib/model-factory';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const siteId = (session?.user as any)?.currentSiteId;
    
    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }
    
    const Taxonomy = await SiteModels.Taxonomy(siteId);
    const taxonomies = await Taxonomy.find({})
      .sort({ menu_position: 1, name: 1 })
      .lean();

    // Format for UI - convert _id to id
    const formattedTaxonomies = taxonomies.map((tax: any) => ({
      ...tax,
      id: tax._id?.toString(),
      label: tax.labels?.plural_name || tax.name || 'Taxonomy',
      singular_label: tax.labels?.singular_name || tax.name || 'Taxonomy',
      hierarchical: tax.is_hierarchical,
      show_in_dashboard: tax.show_in_dashboard !== false,
      show_in_menu: tax.show_in_menu !== false,
      menu_position: tax.menu_position !== undefined ? tax.menu_position : 10,
    }));

    return NextResponse.json({ taxonomies: formattedTaxonomies });
  } catch (error) {
    console.error('Error fetching taxonomies:', error);
    return NextResponse.json({ error: 'Failed to fetch taxonomies' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const siteId = (session.user as any).currentSiteId;
    
    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }
    
    const Taxonomy = await SiteModels.Taxonomy(siteId);
    const body = await request.json();
    const { name, label, singular_label, description, hierarchical, post_types, menu_position } = body;

    if (!name || !label || !singular_label) {
      return NextResponse.json({ 
        error: 'Name, label, and singular label are required' 
      }, { status: 400 });
    }

    // Check if taxonomy already exists
    const existing = await Taxonomy.findOne({ name });
    if (existing) {
      return NextResponse.json({ error: 'Taxonomy with this name already exists' }, { status: 400 });
    }

    // Create taxonomy
    const taxonomy = await Taxonomy.create({
      name,
      slug: name,
      labels: {
        singular_name: singular_label,
        plural_name: label,
        all_items: `All ${label}`,
        edit_item: `Edit ${singular_label}`,
        add_new_item: `Add New ${singular_label}`,
      },
      description: description || '',
      is_hierarchical: hierarchical || false,
      is_public: true,
      show_in_dashboard: true,
      show_in_menu: true,
      menu_position: menu_position !== undefined ? menu_position : 10,
      post_types: post_types || [],
      rewrite_slug: name,
    });

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'taxonomy_created',
      entityType: 'taxonomy',
      entityId: taxonomy._id.toString(),
      entityName: label,
      details: `Created taxonomy: ${label} (${name})`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId: siteId,
    });

    return NextResponse.json({ 
      taxonomy: {
        ...taxonomy.toObject(),
        id: taxonomy._id.toString(),
        label: taxonomy.labels.plural_name,
        singular_label: taxonomy.labels.singular_name,
        hierarchical: taxonomy.is_hierarchical,
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating taxonomy:', error);
    return NextResponse.json({ error: 'Failed to create taxonomy' }, { status: 500 });
  }
}
