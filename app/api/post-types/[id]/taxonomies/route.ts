import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels } from '@/lib/model-factory';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteId = (session.user as any).currentSiteId;

    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid post type ID' }, { status: 400 });
    }

    const PostType = await SiteModels.PostType(siteId);
    const Taxonomy = await SiteModels.Taxonomy(siteId);

    // Get the post type
    const postType = await PostType.findById(params.id).lean();

    if (!postType) {
      return NextResponse.json({ error: 'Post type not found' }, { status: 404 });
    }

    // PostType stores taxonomy names or IDs
    const taxonomyRefs = ((postType as any).taxonomies || []).filter((ref: any) => ref);

    if (taxonomyRefs.length === 0) {
      return NextResponse.json({ taxonomies: [] });
    }

    // Check if first item is ObjectId or name string
    const firstRef = taxonomyRefs[0];
    let taxonomies;
    
    if (typeof firstRef === 'string' && !mongoose.Types.ObjectId.isValid(firstRef)) {
      // It's taxonomy names (e.g., "category", "tag")
      taxonomies = await Taxonomy.find({ name: { $in: taxonomyRefs } }).lean();
    } else {
      // It's ObjectIds
      const taxonomyIds = taxonomyRefs.map((ref: any) => {
        return typeof ref === 'string' ? new mongoose.Types.ObjectId(ref) : ref;
      });
      taxonomies = await Taxonomy.find({ _id: { $in: taxonomyIds } }).lean();
    }

    // Format taxonomies with label and other fields
    const formattedTaxonomies = taxonomies.map((tax: any) => ({
      id: tax._id.toString(),
      name: tax.name,
      label: tax.labels?.plural_name || tax.name || 'Taxonomy',
      singular_label: tax.labels?.singular_name || tax.name || 'Taxonomy',
      hierarchical: tax.is_hierarchical,
    }));

    return NextResponse.json({ taxonomies: formattedTaxonomies });
  } catch (error) {
    console.error('Error fetching post type taxonomies:', error);
    return NextResponse.json({ error: 'Failed to fetch taxonomies' }, { status: 500 });
  }
}

