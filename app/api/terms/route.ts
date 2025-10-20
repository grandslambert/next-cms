import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import connectDB from '@/lib/mongodb';
import { Term, Taxonomy } from '@/lib/models';
import { slugify } from '@/lib/utils';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    const siteId = (session?.user as any)?.currentSiteId;
    
    const searchParams = request.nextUrl.searchParams;
    const taxonomyId = searchParams.get('taxonomy_id');
    const taxonomyName = searchParams.get('taxonomy');

    const query: any = { site_id: siteId };

    if (taxonomyId && /^[0-9a-fA-F]{24}$/.test(taxonomyId)) {
      // If taxonomy_id is provided, it could be for filtering, but our model uses taxonomy name
      const taxonomy = await Taxonomy.findById(taxonomyId).lean();
      if (taxonomy) {
        query.taxonomy = taxonomy.name;
      }
    } else if (taxonomyName) {
      query.taxonomy = taxonomyName;
    }

    const terms = await Term.find(query)
      .sort({ name: 1 })
      .lean();

    // Format for UI
    const formattedTerms = terms.map((term: any) => ({
      ...term,
      id: term._id.toString(),
      taxonomy_name: term.taxonomy,
      hierarchical: term.parent_id ? true : false,
    }));

    return NextResponse.json({ terms: formattedTerms });
  } catch (error) {
    console.error('Error fetching terms:', error);
    return NextResponse.json({ error: 'Failed to fetch terms' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId;

    const body = await request.json();
    const { taxonomy, taxonomy_id, name, description, parent_id } = body;

    if ((!taxonomy && !taxonomy_id) || !name) {
      return NextResponse.json({ error: 'Taxonomy and name are required' }, { status: 400 });
    }

    // Determine taxonomy name
    let taxonomyName = taxonomy;
    if (!taxonomyName && taxonomy_id && /^[0-9a-fA-F]{24}$/.test(taxonomy_id)) {
      const taxonomyDoc = await Taxonomy.findById(taxonomy_id).lean();
      if (taxonomyDoc) {
        taxonomyName = taxonomyDoc.name;
      }
    }

    if (!taxonomyName) {
      return NextResponse.json({ error: 'Invalid taxonomy' }, { status: 400 });
    }

    const slug = slugify(name);

    // Check if slug already exists for this taxonomy
    const existing = await Term.findOne({
      site_id: siteId,
      taxonomy: taxonomyName,
      slug,
    });

    if (existing) {
      return NextResponse.json({ 
        error: 'A term with this name already exists in this taxonomy' 
      }, { status: 409 });
    }

    // Validate parent_id if provided
    if (parent_id && /^[0-9a-fA-F]{24}$/.test(parent_id)) {
      const parentExists = await Term.findById(parent_id);
      if (!parentExists) {
        return NextResponse.json({ error: 'Invalid parent term' }, { status: 400 });
      }
    }

    // Create term
    const newTerm = await Term.create({
      site_id: siteId,
      taxonomy: taxonomyName,
      name,
      slug,
      description: description || '',
      parent_id: (parent_id && /^[0-9a-fA-F]{24}$/.test(parent_id)) ? parent_id : null,
      count: 0,
    });

    // Log activity
    await logActivity({
      userId,
      action: 'term_created',
      entityType: 'term',
      entityId: newTerm._id.toString(),
      entityName: name,
      details: `Created term: ${name} in ${taxonomyName}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ 
      term: {
        id: newTerm._id.toString(),
        ...newTerm.toObject(),
        taxonomy_name: taxonomyName,
        _id: undefined,
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating term:', error);
    return NextResponse.json({ error: 'Failed to create term' }, { status: 500 });
  }
}
