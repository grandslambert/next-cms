import { connectDB } from '@/lib/db';
import { Menu, MenuItem, PostType, Taxonomy, Post, Term } from '@/lib/models';
import mongoose from 'mongoose';

export async function getMenuByLocation(location: string, siteId: string) {
  try {
    if (!siteId || !mongoose.Types.ObjectId.isValid(siteId)) {
      return [];
    }

    await connectDB();

    // Find menu by location
    const menu = await Menu.findOne({
      site_id: new mongoose.Types.ObjectId(siteId),
      location,
    }).lean();

    if (!menu) {
      return [];
    }

    // Get menu items
    const items = await MenuItem.find({ menu_id: menu._id })
      .sort({ menu_order: 1 })
      .lean();

    // Build menu tree
    const enrichedItems = await Promise.all(items.map(async (item) => {
      let url = item.custom_url || '#';
      let label = item.custom_label || '';

      if (item.type === 'post_type' && item.object_id) {
        const postType = await PostType.findById(item.object_id).lean();
        if (postType) {
          url = `/${postType.slug}`;
          label = label || postType.label;
        }
      } else if (item.type === 'taxonomy' && item.object_id) {
        const taxonomy = await Taxonomy.findById(item.object_id).lean();
        if (taxonomy) {
          url = `/${taxonomy.slug}`;
          label = label || taxonomy.label;
        }
      } else if (item.type === 'post' && item.object_id) {
        const post = await Post.findById(item.object_id).lean();
        if (post) {
          url = post.post_type === 'page' ? `/${post.slug}` : `/${post.post_type}/${post.slug}`;
          label = label || post.title;
        }
      } else if (item.type === 'term' && item.object_id) {
        const term = await Term.findById(item.object_id).populate('taxonomy_id').lean();
        if (term && term.taxonomy_id) {
          const taxonomy = term.taxonomy_id as any;
          url = `/${taxonomy.slug}/${term.slug}`;
          label = label || term.name;
        }
      }

      return {
        id: item._id.toString(),
        label,
        url,
        target: item.target || '_self',
        parent_id: item.parent_id?.toString() || null,
        menu_order: item.menu_order,
      };
    }));

    // Build hierarchical structure
    const menuTree: any[] = [];
    const itemMap = new Map();

    enrichedItems.forEach((item) => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    enrichedItems.forEach((item) => {
      const menuItem = itemMap.get(item.id);
      if (item.parent_id) {
        const parent = itemMap.get(item.parent_id);
        if (parent) {
          parent.children.push(menuItem);
        } else {
          menuTree.push(menuItem);
        }
      } else {
        menuTree.push(menuItem);
      }
    });

    return menuTree;
  } catch (error) {
    console.error('Error fetching menu:', error);
    return [];
  }
}
