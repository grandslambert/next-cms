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

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    const permissions = (session.user as any).permissions || {};
    if (!isSuperAdmin && !permissions.manage_menus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const siteId = (session.user as any).currentSiteId;

    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid menu item ID' }, { status: 400 });
    }

    const MenuItemMeta = await SiteModels.MenuItemMeta(siteId);
    const meta = await MenuItemMeta.find({ menu_item_id: new mongoose.Types.ObjectId(params.id) }).lean();

    // Format for UI compatibility
    const formattedMeta = (meta as any[]).map((m: any) => ({
      ...m,
      id: m._id.toString(),
    }));

    return NextResponse.json({ meta: formattedMeta });
  } catch (error) {
    console.error('Error fetching menu item meta:', error);
    return NextResponse.json({ error: 'Failed to fetch menu item meta' }, { status: 500 });
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

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    const permissions = (session.user as any).permissions || {};
    if (!isSuperAdmin && !permissions.manage_menus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const siteId = (session.user as any).currentSiteId;

    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid menu item ID' }, { status: 400 });
    }

    const body = await request.json();
    const { meta, meta_key, meta_value } = body;

    const MenuItemMeta = await SiteModels.MenuItemMeta(siteId);

    // Handle batch meta update (meta object with multiple keys)
    if (meta && typeof meta === 'object') {
      const metaKeys = ['title_attr', 'css_classes', 'xfn', 'description'];
      const results = [];

      for (const key of metaKeys) {
        if (meta.hasOwnProperty(key)) {
          const updated = await MenuItemMeta.findOneAndUpdate(
            {
              menu_item_id: new mongoose.Types.ObjectId(params.id),
              meta_key: key,
            },
            {
              meta_value: meta[key] || '',
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
          ...m.toObject(),
          id: m._id.toString(),
        }))
      });
    }

    // Handle single meta key/value update (legacy support)
    if (!meta_key) {
      return NextResponse.json({ error: 'meta_key or meta object is required' }, { status: 400 });
    }

    const updatedMeta = await MenuItemMeta.findOneAndUpdate(
      {
        menu_item_id: new mongoose.Types.ObjectId(params.id),
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
        ...updatedMeta.toObject(),
        id: updatedMeta._id.toString(),
      }
    });
  } catch (error) {
    console.error('Error updating menu item meta:', error);
    return NextResponse.json({ error: 'Failed to update menu item meta' }, { status: 500 });
  }
}
