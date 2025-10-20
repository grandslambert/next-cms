import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import connectDB from '@/lib/mongodb';
import { Term, PostTerm, Taxonomy } from '@/lib/models';

// Get terms for a specific post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    
    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(params.id)) {
      return NextResponse.json({ error: 'Invalid post ID format' }, { status: 400 });
    }

    const siteId = (session?.user as any)?.currentSiteId;
    
    const searchParams = request.nextUrl.searchParams;
    const taxonomyName = searchParams.get('taxonomy');

    // Get post-term relationships
    const postTermQuery: any = { post_id: params.id };
    if (taxonomyName) {
      postTermQuery.taxonomy = taxonomyName;
    }

    const postTerms = await PostTerm.find(postTermQuery).lean();
    const termIds = postTerms.map(pt => pt.term_id);

    if (termIds.length === 0) {
      return NextResponse.json({ terms: [] });
    }

    // Get full term details
    const terms = await Term.find({
      _id: { $in: termIds },
      site_id: siteId,
    })
    .sort({ name: 1 })
    .lean();

    // Format for UI
    const formattedTerms = terms.map((term: any) => ({
      ...term,
      id: term._id.toString(),
      taxonomy_name: term.taxonomy,
      _id: undefined,
    }));

    return NextResponse.json({ terms: formattedTerms });
  } catch (error) {
    console.error('Error fetching post terms:', error);
    return NextResponse.json({ error: 'Failed to fetch post terms' }, { status: 500 });
  }
}

// Set terms for a specific post (replaces all existing terms for the given taxonomy)
export async function PUT(
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
      return NextResponse.json({ error: 'Invalid post ID format' }, { status: 400 });
    }

    const siteId = (session.user as any).currentSiteId;

    const body = await request.json();
    const { term_ids, taxonomy, taxonomy_id } = body;

    // Determine taxonomy name
    let taxonomyName = taxonomy;
    if (!taxonomyName && taxonomy_id && /^[0-9a-fA-F]{24}$/.test(taxonomy_id)) {
      const taxonomyDoc = await Taxonomy.findById(taxonomy_id).lean();
      if (taxonomyDoc) {
        taxonomyName = taxonomyDoc.name;
      }
    }

    if (!taxonomyName) {
      return NextResponse.json({ error: 'Taxonomy is required' }, { status: 400 });
    }

    // Remove existing relationships for this taxonomy
    await PostTerm.deleteMany({
      post_id: params.id,
      taxonomy: taxonomyName,
    });

    // Add new relationships
    if (term_ids && term_ids.length > 0) {
      // Validate all term IDs
      const validTermIds = term_ids.filter((id: string) => /^[0-9a-fA-F]{24}$/.test(id));
      
      if (validTermIds.length > 0) {
        // Verify terms exist and belong to this taxonomy
        const terms = await Term.find({
          _id: { $in: validTermIds },
          site_id: siteId,
          taxonomy: taxonomyName,
        }).lean();

        if (terms.length > 0) {
          // Create post-term relationships
          const postTermDocs = terms.map((term: any, index) => ({
            site_id: siteId,
            post_id: params.id,
            term_id: term._id.toString(),
            taxonomy: taxonomyName,
            order: index,
          }));

          await PostTerm.insertMany(postTermDocs);

          // Update term counts
          const termCounts = await PostTerm.aggregate([
            { $match: { taxonomy: taxonomyName } },
            { $group: { _id: '$term_id', count: { $sum: 1 } } },
          ]);

          // Update each term's count
          for (const tc of termCounts) {
            await Term.findByIdAndUpdate(tc._id, { $set: { count: tc.count } });
          }

          // Reset count for terms not in the list
          const countsMap = new Map(termCounts.map(tc => [tc._id, tc.count]));
          const allTerms = await Term.find({ site_id: siteId, taxonomy: taxonomyName }).select('_id').lean();
          for (const term of allTerms) {
            const termId = term._id.toString();
            if (!countsMap.has(termId)) {
              await Term.findByIdAndUpdate(termId, { $set: { count: 0 } });
            }
          }
        }
      }
    } else {
      // If no terms provided, reset counts for all terms in this taxonomy
      await Term.updateMany(
        { site_id: siteId, taxonomy: taxonomyName },
        { $set: { count: 0 } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating post terms:', error);
    return NextResponse.json({ error: 'Failed to update post terms' }, { status: 500 });
  }
}
