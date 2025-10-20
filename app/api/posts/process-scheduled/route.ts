import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Post } from '@/lib/models';

export async function POST(request: NextRequest) {
  try {
    // This endpoint can be called by cron jobs to publish scheduled posts
    // Optional: Add API key authentication for security

    await connectDB();

    const now = new Date();

    // Find all scheduled posts where published_at is in the past
    const result = await Post.updateMany(
      {
        status: 'scheduled',
        published_at: { $lte: now },
      },
      {
        $set: { status: 'published' },
      }
    );

    return NextResponse.json({ 
      success: true,
      processed: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error processing scheduled posts:', error);
    return NextResponse.json({ error: 'Failed to process scheduled posts' }, { status: 500 });
  }
}
