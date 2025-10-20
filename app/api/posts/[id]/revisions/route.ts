import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { PostRevision } from '@/lib/models';
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
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    await connectDB();

    const revisions = await PostRevision.find({ post_id: new mongoose.Types.ObjectId(params.id) })
      .populate('author_id', 'username email')
      .sort({ created_at: -1 })
      .lean();

    // Format for UI compatibility
    const formattedRevisions = revisions.map((rev) => ({
      ...rev,
      id: rev._id.toString(),
      author_name: (rev.author_id as any)?.username || 'Unknown',
    }));

    return NextResponse.json({ revisions: formattedRevisions });
  } catch (error) {
    console.error('Error fetching post revisions:', error);
    return NextResponse.json({ error: 'Failed to fetch post revisions' }, { status: 500 });
  }
}
