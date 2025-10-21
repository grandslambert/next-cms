import { NextRequest, NextResponse } from 'next/server';
import { GlobalModels, SiteModels } from '@/lib/model-factory';
import { connectToGlobalDB } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    // This endpoint can be called by cron jobs to publish scheduled posts
    // Optional: Add API key authentication for security

    await connectToGlobalDB();

    const Site = await GlobalModels.Site();
    const sites = await Site.find({}).lean();

    const now = new Date();
    let totalProcessed = 0;

    // Process scheduled posts for each site
    for (const site of sites as any[]) {
      const Post = await SiteModels.Post(site.id);
      
      // Find all scheduled posts where scheduled_publish_at is in the past
      const result = await Post.updateMany(
        {
          status: 'scheduled',
          scheduled_publish_at: { $lte: now },
        },
        {
          $set: { 
            status: 'published',
            published_at: now,
          },
        }
      );

      totalProcessed += result.modifiedCount || 0;
    }

    return NextResponse.json({ 
      success: true,
      processed: totalProcessed,
      sitesChecked: sites.length,
    });
  } catch (error) {
    console.error('Error processing scheduled posts:', error);
    return NextResponse.json({ error: 'Failed to process scheduled posts' }, { status: 500 });
  }
}
