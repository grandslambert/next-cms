import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { Taxonomy } from '@/lib/models';
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

    // Find taxonomies assigned to this post type
    const taxonomies = await Taxonomy.find({
      post_types: new mongoose.Types.ObjectId(params.id),
    }).lean();

    // Format for UI compatibility
    const formattedTaxonomies = taxonomies.map((tax) => ({
      ...tax,
      id: tax._id.toString(),
    }));

    return NextResponse.json({ taxonomies: formattedTaxonomies });
  } catch (error) {
    console.error('Error fetching post type taxonomies:', error);
    return NextResponse.json({ error: 'Failed to fetch taxonomies' }, { status: 500 });
  }
}
