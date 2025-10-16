'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const staticMenuItems = [
  { name: 'Dashboard', href: '/admin', icon: '📊', position: 0, permission: 'view_dashboard' },
  { name: 'Media', href: '/admin/media', icon: '🖼️', position: 20, permission: 'manage_media' },
  { 
    name: 'Users', 
    icon: '👥', 
    position: 25,
    permission: 'manage_users',
    subItems: [
      { name: 'All Users', href: '/admin/users', icon: '👤', permission: 'manage_users' },
      { name: 'Roles', href: '/admin/users/roles', icon: '🎭', permission: 'manage_roles' },
    ]
  },
  { 
    name: 'Content Types', 
    icon: '📋', 
    position: 27,
    permission: 'manage_post_types',
    subItems: [
      { name: 'Post Types', href: '/admin/content-types/post-types', icon: '📝', permission: 'manage_post_types' },
      { name: 'Taxonomies', href: '/admin/content-types/taxonomies', icon: '🏷️', permission: 'manage_post_types' },
    ]
  },
  { 
    name: 'Settings', 
    icon: '⚙️', 
    position: 30,
    permission: 'manage_settings',
    subItems: [
      { name: 'General', href: '/admin/settings', icon: '🔧', permission: 'manage_settings' },
      { name: 'Media', href: '/admin/settings/media', icon: '🖼️', permission: 'manage_settings' },
    ]
  },
  { name: 'View Site', href: '/', icon: '🌐', external: true, position: 99 }, // No permission required
];

const hasPermission = (permissions: any, requiredPermission: string | undefined): boolean => {
  if (!requiredPermission) return true; // No permission required
  if (!permissions) return false;
  return permissions[requiredPermission] === true;
};

const getStaticMenuItemsWithTaxonomies = (taxonomiesData: any, permissions: any) => {
  const items = [...staticMenuItems].filter(item => hasPermission(permissions, item.permission));
  
  // Filter subitems based on permissions
  const filteredItems = items.map(item => {
    if (item.subItems) {
      const filteredSubItems = item.subItems.filter((subItem: any) => 
        hasPermission(permissions, subItem.permission)
      );
      return { ...item, subItems: filteredSubItems };
    }
    return item;
  });
  
  // Create Taxonomies submenu if there are taxonomies to show
  if (taxonomiesData?.taxonomies && hasPermission(permissions, 'manage_taxonomies')) {
    const taxonomySubItems = taxonomiesData.taxonomies
      .filter((taxonomy: any) => taxonomy.show_in_menu)
      .map((taxonomy: any) => ({
        name: taxonomy.label,
        href: `/admin/taxonomy/${taxonomy.name}`,
        icon: taxonomy.hierarchical ? '🏷️' : '🔖',
        permission: 'manage_taxonomies',
      }));
    
    if (taxonomySubItems.length > 0) {
      filteredItems.push({
        name: 'Taxonomies',
        icon: '🏷️',
        position: 22,
        permission: 'manage_taxonomies',
        subItems: taxonomySubItems,
      });
    }
  }
  
  return filteredItems;
};

export default function Sidebar() {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const { data: session } = useSession();
  const permissions = (session?.user as any)?.permissions || {};
  
  // Fetch custom post types
  const { data: postTypesData } = useQuery({
    queryKey: ['post-types'],
    queryFn: async () => {
      const res = await axios.get('/api/post-types');
      return res.data;
    },
  });

  // Fetch taxonomies
  const { data: taxonomiesData } = useQuery({
    queryKey: ['taxonomies'],
    queryFn: async () => {
      const res = await axios.get('/api/taxonomies');
      return res.data;
    },
  });

  // Build menu items including custom post types
  const menuItems = getStaticMenuItemsWithTaxonomies(taxonomiesData, permissions);
  
  // Add post types (visible to users with specific post type permissions)
  if (postTypesData?.postTypes) {
    postTypesData.postTypes.forEach((postType: any) => {
      const postTypePermission = `manage_posts_${postType.name}`;
      if (permissions[postTypePermission]) {
        menuItems.push({
          name: postType.label,
          href: `/admin/post-type/${postType.name}`,
          icon: postType.icon || '📄',
          position: postType.menu_position || 5,
          permission: postTypePermission,
        });
      }
    });
  }

  // Sort by position
  menuItems.sort((a, b) => a.position - b.position);

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold">Next CMS</h1>
      </div>

      <nav className="flex-1 px-4">
        <ul className="space-y-2">
          {menuItems.map((item: any) => {
            // Check if item has sub-items and if any are active
            const hasActiveSubItem = item.subItems?.some((subItem: any) => 
              pathname?.startsWith(subItem.href)
            );
            
            const isHovered = hoveredItem === item.name;
            const showSubItems = item.subItems && (isHovered || hasActiveSubItem);

            // For items with sub-items, check if parent path is active
            const isActive = item.href
              ? item.href === '/admin' 
                ? pathname === item.href
                : pathname?.startsWith(item.href)
              : false;

            // If item has sub-items, render with submenu
            if (item.subItems) {
              return (
                <li 
                  key={item.name}
                  onMouseEnter={() => setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <div
                    className={cn(
                      'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors cursor-default',
                      hasActiveSubItem
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    )}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="flex-1">{item.name}</span>
                    <span className="text-sm">{showSubItems ? '▼' : '▶'}</span>
                  </div>
                  {showSubItems && (
                    <ul className="ml-4 mt-1 space-y-1">
                      {item.subItems.map((subItem: any) => {
                        const isSubItemActive = pathname?.startsWith(subItem.href);
                        return (
                          <li key={subItem.href}>
                            <Link
                              href={subItem.href}
                              className={cn(
                                'flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors text-sm',
                                isSubItemActive
                                  ? 'bg-primary-600 text-white'
                                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                              )}
                            >
                              <span>{subItem.icon}</span>
                              <span>{subItem.name}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            // Regular menu item without sub-items
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  )}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-700">
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors mb-2"
        >
          <span className="text-xl">🚪</span>
          <span>Logout</span>
        </button>
        <div className="text-center text-xs text-gray-500 mt-2">
          Next CMS v1.3.6
        </div>
      </div>
    </aside>
  );
}

