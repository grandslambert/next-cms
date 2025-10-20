import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { MenuItem, MenuItemMeta, PostType, Taxonomy, Post, Term } from '@/lib/models';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const menuId = searchParams.get('menu_id');

    if (!menuId) {
      return NextResponse.json({ error: 'menu_id is required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      return NextResponse.json({ error: 'Invalid menu ID' }, { status: 400 });
    }

    await connectDB();

    const items = await MenuItem.find({ menu_id: new mongoose.Types.ObjectId(menuId) })
      .sort({ menu_order: 1, _id: 1 })
      .lean();

    // Fetch additional data based on type
    const enrichedItems = await Promise.all(items.map(async (item) => {
      const enriched: any = { ...item, id: item._id.toString() };

      // Fetch related object data based on type
      if (item.type === 'post_type' && item.object_id) {
        const postType = await PostType.findById(item.object_id).lean();
        enriched.post_type_label = postType?.label;
      } else if (item.type === 'taxonomy' && item.object_id) {
        const taxonomy = await Taxonomy.findById(item.object_id).lean();
        enriched.taxonomy_label = taxonomy?.label;
      } else if (item.type === 'post' && item.object_id) {
        const post = await Post.findById(item.object_id).lean();
        enriched.post_title = post?.title;
      } else if (item.type === 'term' && item.object_id) {
        const term = await Term.findById(item.object_id).lean();
        enriched.term_name = term?.name;
        if (term?.taxonomy_id) {
          const taxonomy = await Taxonomy.findById(term.taxonomy_id).lean();
          enriched.term_taxonomy_label = taxonomy?.label;
        }
      }

      // Fetch meta data for this item
      const metaItems = await MenuItemMeta.find({ menu_item_id: item._id }).lean();
      metaItems.forEach((meta) => {
        enriched[meta.meta_key] = meta.meta_value;
      });

      return enriched;
    }));

    return NextResponse.json({ items: enrichedItems });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { menu_id, parent_id, type, object_id, post_type, custom_url, custom_label, menu_order, target } = body;

    if (!menu_id || !type) {
      return NextResponse.json({ error: 'menu_id and type are required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(menu_id)) {
      return NextResponse.json({ error: 'Invalid menu ID' }, { status: 400 });
    }

    if (type === 'custom' && !custom_url) {
      return NextResponse.json({ error: 'custom_url is required for custom links' }, { status: 400 });
    }

    if ((type === 'post' || type === 'post_type' || type === 'taxonomy' || type === 'term') && !object_id) {
      return NextResponse.json({ error: 'object_id is required for this type' }, { status: 400 });
    }

    // Validate object_id if provided
    if (object_id && !mongoose.Types.ObjectId.isValid(object_id)) {
      return NextResponse.json({ error: 'Invalid object ID' }, { status: 400 });
    }

    // Validate parent_id if provided
    if (parent_id && !mongoose.Types.ObjectId.isValid(parent_id)) {
      return NextResponse.json({ error: 'Invalid parent ID' }, { status: 400 });
    }

    await connectDB();

    const newItem = await MenuItem.create({
      menu_id: new mongoose.Types.ObjectId(menu_id),
      parent_id: parent_id ? new mongoose.Types.ObjectId(parent_id) : null,
      type,
      object_id: object_id ? new mongoose.Types.ObjectId(object_id) : null,
      post_type: post_type || null,
      custom_url: custom_url || null,
      custom_label: custom_label || null,
      menu_order: menu_order || 0,
      target: target || '_self',
    });

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'menu_item_created' as any,
      entityType: 'menu_item' as any,
      entityId: newItem._id.toString(),
      entityName: custom_label || `${type} item`,
      details: `Added menu item to menu ID ${menu_id}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ 
      item: {
        ...newItem.toObject(),
        id: newItem._id.toString(),
      }
    });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 });
  }
}
