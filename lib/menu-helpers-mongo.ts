import connectDB from '@/lib/mongodb';
import { Menu, MenuItem } from '@/lib/models';

export interface MenuItem {
  id: string;
  parent_id: string | null;
  label: string;
  url: string;
  target: string;
  title_attr?: string;
  css_classes?: string;
  xfn?: string;
  description?: string;
}

export async function getMenuByLocation(location: string, siteIdStr?: string): Promise<MenuItem[]> {
  try {
    await connectDB();
    
    // Find menu by location (and optionally by site)
    const menuQuery: any = { location };
    if (siteIdStr && /^[0-9a-fA-F]{24}$/.test(siteIdStr)) {
      menuQuery.site_id = siteIdStr;
    }

    const menu = await Menu.findOne(menuQuery).lean();

    if (!menu) {
      return [];
    }

    // Get menu items for this menu
    const items = await MenuItem.find({ menu_id: menu._id })
      .sort({ menu_order: 1 })
      .lean();

    // Format items for the frontend
    const formattedItems: MenuItem[] = items.map((item: any) => {
      let url = '';
      let label = item.custom_label || '';

      // Generate URL based on type
      if (item.type === 'custom') {
        url = item.custom_url || '';
        label = label || item.custom_url || '';
      } else {
        // For now, just use # for non-custom items
        // TODO: Populate post type/taxonomy/post/term details when converting content APIs
        url = '#';
        label = label || 'Menu Item';
      }

      return {
        id: item._id.toString(),
        parent_id: item.parent_id?.toString() || null,
        label,
        url,
        target: item.target || '_self',
        title_attr: item.title_attr || '',
        css_classes: item.css_classes || '',
        xfn: item.xfn || '',
        description: item.description || '',
      };
    });

    return formattedItems;
  } catch (error) {
    console.error('Error fetching menu:', error);
    return [];
  }
}

