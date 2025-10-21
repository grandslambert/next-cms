import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { Taxonomy, PostType } from '@/lib/models';
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

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid post type ID' }, { status: 400 });
    }

    await connectDB();

    // First, get the post type to find its name
    const postType = await PostType.findById(params.id).lean();
    
    if (!postType) {
      return NextResponse.json({ error: 'Post type not found' }, { status: 404 });
    }

    // Find taxonomies that include this post type name in their post_types array
    const taxonomies = await Taxonomy.find({
      site_id: (postType as any).site_id,
      post_types: (postType as any).name,
    }).lean();

    // Format for UI compatibility
    const formattedTaxonomies = taxonomies.map((tax: any) => ({
      ...tax,
      id: tax._id.toString(),
      label: tax.labels?.plural_name || tax.name,
      singular_label: tax.labels?.singular_name || tax.name,
    }));

    return NextResponse.json({ taxonomies: formattedTaxonomies });
  } catch (error) {
    console.error('Error fetching post type taxonomies:', error);
    return NextResponse.json({ error: 'Failed to fetch taxonomies' }, { status: 500 });
  }
}
