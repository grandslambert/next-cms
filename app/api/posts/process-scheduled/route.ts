import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // This endpoint can be called by cron jobs, so we'll allow it without auth
    // In production, you should protect this with an API key or secret
    
    // Find all scheduled posts where scheduled_publish_at is in the past
    const [scheduledPosts] = await db.query<RowDataPacket[]>(
      `SELECT id, title, scheduled_publish_at 
       FROM posts 
       WHERE status = 'scheduled' 
       AND scheduled_publish_at IS NOT NULL 
       AND scheduled_publish_at <= NOW()`
    );

    if (scheduledPosts.length === 0) {
      return NextResponse.json({ 
        message: 'No scheduled posts to publish',
        published_count: 0 
      });
    }

    // Publish all scheduled posts
    const publishedIds: number[] = [];
    for (const post of scheduledPosts) {
      await db.query<ResultSetHeader>(
        `UPDATE posts 
         SET status = 'published', published_at = scheduled_publish_at 
         WHERE id = ?`,
        [post.id]
      );
      publishedIds.push(post.id);
      console.log(`Published scheduled post: ${post.title} (ID: ${post.id})`);
    }

    return NextResponse.json({ 
      message: `Successfully published ${scheduledPosts.length} post(s)`,
      published_count: scheduledPosts.length,
      published_ids: publishedIds
    });
  } catch (error) {
    console.error('Error processing scheduled posts:', error);
    return NextResponse.json({ error: 'Failed to process scheduled posts' }, { status: 500 });
  }
}

