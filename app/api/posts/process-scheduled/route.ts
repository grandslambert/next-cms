import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // This endpoint can be called by cron jobs, so we'll allow it without auth
    // In production, you should protect this with an API key or secret
    
    // Get all active sites
    const [sites] = await db.query<RowDataPacket[]>(
      'SELECT id FROM sites WHERE is_active = TRUE'
    );

    let totalPublished = 0;
    const publishedBySite: { [siteId: number]: number } = {};

    // Process scheduled posts for each site
    for (const site of sites) {
      const siteId = site.id;
      const postsTable = getSiteTable(siteId, 'posts');

      // Find all scheduled posts where scheduled_publish_at is in the past
      const [scheduledPosts] = await db.query<RowDataPacket[]>(
        `SELECT id, title, scheduled_publish_at 
         FROM ${postsTable}
         WHERE status = 'scheduled' 
         AND scheduled_publish_at IS NOT NULL 
         AND scheduled_publish_at <= NOW()`
      );

      if (scheduledPosts.length > 0) {
        // Publish all scheduled posts for this site
        for (const post of scheduledPosts) {
          await db.query<ResultSetHeader>(
            `UPDATE ${postsTable}
             SET status = 'published', published_at = scheduled_publish_at 
             WHERE id = ?`,
            [post.id]
          );
          console.log(`[Site ${siteId}] Published scheduled post: ${post.title} (ID: ${post.id})`);
        }
        publishedBySite[siteId] = scheduledPosts.length;
        totalPublished += scheduledPosts.length;
      }
    }

    if (totalPublished === 0) {
      return NextResponse.json({ 
        message: 'No scheduled posts to publish',
        published_count: 0 
      });
    }

    return NextResponse.json({ 
      message: `Successfully published ${totalPublished} post(s) across ${Object.keys(publishedBySite).length} site(s)`,
      published_count: totalPublished,
      published_by_site: publishedBySite
    });
  } catch (error) {
    console.error('Error processing scheduled posts:', error);
    return NextResponse.json({ error: 'Failed to process scheduled posts' }, { status: 500 });
  }
}

