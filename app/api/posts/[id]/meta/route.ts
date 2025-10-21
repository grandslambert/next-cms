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

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    const siteId = (session.user as any).currentSiteId;
    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    const PostMeta = await SiteModels.PostMeta(siteId);
    const meta = await PostMeta.find({ post_id: new mongoose.Types.ObjectId(params.id) }).lean();

    // Format for UI compatibility
    const formattedMeta = (meta as any[]).map((m) => ({
      ...m,
      id: m._id.toString(),
    }));

    return NextResponse.json({ meta: formattedMeta });
  } catch (error) {
    console.error('Error fetching post meta:', error);
    return NextResponse.json({ error: 'Failed to fetch post meta' }, { status: 500 });
  }
}

export async function PUT(
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

    const body = await request.json();
    const { meta_key, meta_value, meta } = body;

    const siteId = (session.user as any).currentSiteId;
    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    const PostMeta = await SiteModels.PostMeta(siteId);

    // Handle batch meta update (meta object or array)
    if (meta && typeof meta === 'object') {
      const results = [];
      
      // If meta is an array
      if (Array.isArray(meta)) {
        for (const item of meta) {
          if (item.meta_key) {
            const updated = await PostMeta.findOneAndUpdate(
              {
                post_id: new mongoose.Types.ObjectId(params.id),
                meta_key: item.meta_key,
              },
              {
                meta_value: item.meta_value || '',
              },
              {
                upsert: true,
                new: true,
              }
            );
            results.push(updated);
          }
        }
      } else {
        // If meta is an object with key-value pairs
        for (const [key, value] of Object.entries(meta)) {
          const updated = await PostMeta.findOneAndUpdate(
            {
              post_id: new mongoose.Types.ObjectId(params.id),
              meta_key: key,
            },
            {
              meta_value: value || '',
            },
            {
              upsert: true,
              new: true,
            }
          );
          results.push(updated);
        }
      }

      return NextResponse.json({
        success: true,
        meta: results.map(m => ({
          ...(m as any).toObject(),
          id: (m as any)._id.toString(),
        }))
      });
    }

    // Handle single meta key/value update (legacy support)
    if (!meta_key) {
      // If no meta_key and no meta object, just return success (custom fields are optional)
      return NextResponse.json({ success: true });
    }

    // Upsert single meta value
    const updatedMeta = await PostMeta.findOneAndUpdate(
      {
        post_id: new mongoose.Types.ObjectId(params.id),
        meta_key,
      },
      {
        meta_value: meta_value || '',
      },
      {
        upsert: true,
        new: true,
      }
    );

    return NextResponse.json({
      success: true,
      meta: {
        ...(updatedMeta as any).toObject(),
        id: (updatedMeta as any)._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error updating post meta:', error);
    return NextResponse.json({ error: 'Failed to update post meta' }, { status: 500 });
  }
}
