import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Menu, MenuItem } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const location = searchParams.get('location');
    const siteIdParam = searchParams.get('site_id');

    if (!location) {
      return NextResponse.json({ error: 'location parameter is required' }, { status: 400 });
    }

    // Validate site_id if provided
    if (siteIdParam && !/^[0-9a-fA-F]{24}$/.test(siteIdParam)) {
      return NextResponse.json({ error: 'Invalid site ID format' }, { status: 400 });
    }

    // Find menu by location (and optionally by site)
    const menuQuery: any = { location };
    if (siteIdParam) {
      menuQuery.site_id = siteIdParam;
    }

    const menu = await Menu.findOne(menuQuery).lean();

    if (!menu) {
      return NextResponse.json({ menu: null, items: [] });
    }

    // Get menu items for this menu
    const items = await MenuItem.find({ menu_id: menu._id })
      .sort({ menu_order: 1 })
      .lean();

    // Format items for the frontend
    const formattedItems = items.map((item: any) => {
      let url = '';
      let label = item.custom_label || '';

      // Generate URL based on type
      if (item.type === 'custom') {
        url = item.custom_url || '';
        label = label || item.custom_url || '';
      } else if (item.type === 'post_type') {
        // For now, just use a basic URL structure
        // TODO: Populate post type details when converting content APIs
        url = '#';
        label = label || 'Post Type';
      } else if (item.type === 'taxonomy') {
        // TODO: Populate taxonomy details
        url = '#';
        label = label || 'Taxonomy';
      } else if (item.type === 'post') {
        // TODO: Populate post details
        url = '#';
        label = label || 'Post';
      } else if (item.type === 'term') {
        // TODO: Populate term details
        url = '#';
        label = label || 'Term';
      }

      return {
        id: item._id.toString(),
        parent_id: item.parent_id?.toString() || null,
        label,
        url,
        target: item.target || '_self',
        title_attr: item.title_attr || '',
        css_classes: item.css_classes || '',
        description: item.description || '',
      };
    });

    return NextResponse.json({ 
      menu: {
        id: menu._id.toString(),
        name: menu.name,
        display_name: menu.display_name,
        location: menu.location,
      },
      items: formattedItems 
    });
  } catch (error) {
    console.error('Error fetching public menu:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}
