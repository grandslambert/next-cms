import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import connectDB from '@/lib/mongodb';
import { Taxonomy } from '@/lib/models';

export async function GET() {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    const siteId = (session?.user as any)?.currentSiteId || 1;
    
    const taxonomies = await Taxonomy.find({ site_id: siteId })
      .sort({ name: 1 })
      .lean();

    // Format for UI - convert _id to id
    const formattedTaxonomies = taxonomies.map((tax: any) => ({
      ...tax,
      id: tax._id?.toString(),
      label: tax.labels?.plural_name,
    }));

    return NextResponse.json({ taxonomies: formattedTaxonomies });
  } catch (error) {
    console.error('Error fetching taxonomies:', error);
    return NextResponse.json({ error: 'Failed to fetch taxonomies' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const siteId = (session.user as any).currentSiteId || 1;
    const body = await request.json();
    const { name, label, singular_label, description, hierarchical, post_types } = body;

    if (!name || !label || !singular_label) {
      return NextResponse.json({ 
        error: 'Name, label, and singular label are required' 
      }, { status: 400 });
    }

    // Check if taxonomy already exists
    const existing = await Taxonomy.findOne({ site_id: siteId, name });
    if (existing) {
      return NextResponse.json({ error: 'Taxonomy with this name already exists' }, { status: 400 });
    }

    // Create taxonomy
    const taxonomy = await Taxonomy.create({
      site_id: siteId,
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
      post_types: post_types || [],
      rewrite_slug: name,
    });

    return NextResponse.json({ 
      taxonomy: {
        ...taxonomy.toObject(),
        id: taxonomy._id.toString(),
        label: taxonomy.labels.plural_name,
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating taxonomy:', error);
    return NextResponse.json({ error: 'Failed to create taxonomy' }, { status: 500 });
  }
}
