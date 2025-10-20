'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import SiteSwitcher from './SiteSwitcher';
import SwitchBackButton from './SwitchBackButton';

const staticMenuItems = [
  { name: 'Dashboard', href: '/admin', icon: '📊', position: 0, permission: 'view_dashboard' },
  { name: 'Sites', href: '/admin/sites', icon: '🌐', position: 1, superAdminOnly: true },
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
    name: 'Appearance', 
    icon: '🎨', 
    position: 25,
    permission: 'manage_menus',
    subItems: [
      { name: 'Menus', href: '/admin/navigation', icon: '🧭', permission: 'manage_menus' },
      { name: 'Menu Locations', href: '/admin/settings/menus', icon: '📍', permission: 'manage_settings' },
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
      { name: 'Authentication', href: '/admin/settings/authentication', icon: '🔐', permission: 'manage_settings' },
    ]
  },
  { 
    name: 'Tools', 
    icon: '🛠️', 
    position: 35,
    subItems: [
      { name: 'Activity Log', href: '/admin/activity-log', icon: '📋', permission: 'manage_users' },
      { name: 'Import/Export', href: '/admin/tools/import-export', icon: '📦', permission: 'manage_settings' },
    ]
  },
];

const hasPermission = (permissions: any, requiredPermission: string | undefined, isSuperAdmin: boolean = false): boolean => {
  // Super admins bypass all permission checks
  if (isSuperAdmin) return true;
  if (!requiredPermission) return true; // No permission required
  if (!permissions) return false;
  return permissions[requiredPermission] === true;
};

const getStaticMenuItemsWithTaxonomies = (taxonomiesData: any, permissions: any, isSuperAdmin: boolean) => {
  // Super admin only sees Sites, Users, Activity Log, and Settings
  if (isSuperAdmin) {
    return [
      { name: 'Sites', href: '/admin/sites', icon: '🌐', position: 0 },
      { 
        name: 'Users', 
        href: '#',
        icon: '👥', 
        position: 1,
        subItems: [
          { name: 'All Users', href: '/admin/users', icon: '👤', permission: 'manage_users' },
          { name: 'Roles', href: '/admin/users/roles', icon: '🎭', permission: 'manage_roles' },
        ]
      },
      { 
        name: 'Activity Log', 
        href: '/admin/activity-log',
        icon: '📋', 
        position: 2,
      },
      { 
        name: 'Settings', 
        href: '/admin/settings/global',
        icon: '⚙️', 
        position: 3,
      },
    ];
  }

  const items = [...staticMenuItems].filter(item => {
    // Filter super admin only items
    if ((item as any).superAdminOnly && !isSuperAdmin) return false;
    return hasPermission(permissions, item.permission, isSuperAdmin);
  });
  
  // Filter subitems based on permissions
  const filteredItems = items.map(item => {
    if (item.subItems) {
      const filteredSubItems = item.subItems.filter((subItem: any) => 
        hasPermission(permissions, subItem.permission, isSuperAdmin)
      );
      return { ...item, subItems: filteredSubItems };
    }
    return item;
  });
  
  // Create Taxonomies submenu if there are taxonomies to show
  if (taxonomiesData?.taxonomies && hasPermission(permissions, 'manage_taxonomies', isSuperAdmin)) {
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
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const { data: session } = useSession();
  const permissions = (session?.user as any)?.permissions || {};
  const isSuperAdmin = (session?.user as any)?.isSuperAdmin || false;
  const isSwitched = (session?.user as any)?.isSwitched || false;
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);
  
  // Fetch custom post types (skip for super admins - they don't need them in sidebar)
  const { data: postTypesData } = useQuery({
    queryKey: ['post-types'],
    queryFn: async () => {
      const res = await axios.get('/api/post-types');
      return res.data;
    },
    enabled: !isSuperAdmin, // Super admins don't need post types in sidebar
  });

  // Fetch taxonomies (skip for super admins - they don't need them in sidebar)
  const { data: taxonomiesData } = useQuery({
    queryKey: ['taxonomies'],
    queryFn: async () => {
      const res = await axios.get('/api/taxonomies');
      return res.data;
    },
    enabled: !isSuperAdmin, // Super admins don't need taxonomies in sidebar
  });

  // Build menu items including custom post types
  const menuItems = getStaticMenuItemsWithTaxonomies(taxonomiesData, permissions, isSuperAdmin);
  
  // Add post types (visible to users with specific post type permissions, but not super admins)
  if (!isSuperAdmin && postTypesData?.postTypes) {
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
  if (!isSuperAdmin) {
    menuItems.sort((a, b) => a.position - b.position);
  }

  const userName = session?.user?.name || session?.user?.email;
  const userRole = (session?.user as any)?.role || 'user';

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="px-8 py-4 flex items-center justify-between border-b border-gray-700">
        <h1 className="text-2xl font-bold">Next CMS</h1>
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-2xl hover:opacity-80 transition-opacity"
          title="View Site"
        >
          🌐
        </Link>
      </div>

      {/* Site Switcher at top (not shown for super admins) */}
      {!isSuperAdmin && (
        <div className="px-4 py-3 border-b border-gray-700">
          <SiteSwitcher />
        </div>
      )}

      <nav className="flex-1 px-4">
        <ul className="space-y-2">
          {menuItems.map((item: any) => {
            // Check if item has sub-items and if any are active
            const hasActiveSubItem = item.subItems?.some((subItem: any) =>
              pathname === subItem.href
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
                  className="relative"
                  onMouseEnter={() => {
                    if (hoverTimeout) {
                      clearTimeout(hoverTimeout);
                      setHoverTimeout(null);
                    }
                    setHoveredItem(item.name);
                  }}
                  onMouseLeave={() => {
                    const timeout = setTimeout(() => {
                      setHoveredItem(null);
                    }, 300);
                    setHoverTimeout(timeout);
                  }}
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
                    <span className="text-sm">{hasActiveSubItem ? '▼' : '▶'}</span>
                  </div>
                  
                  {/* Flyout submenu - ONLY on hover (not when active) */}
                  {isHovered && !hasActiveSubItem && (
                    <div 
                      className="absolute left-full top-0 ml-1 min-w-[200px] bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-2 z-50"
                      onMouseEnter={() => {
                        if (hoverTimeout) {
                          clearTimeout(hoverTimeout);
                          setHoverTimeout(null);
                        }
                        setHoveredItem(item.name);
                      }}
                    >
                      {item.subItems.map((subItem: any) => {
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className="flex items-center space-x-3 px-4 py-2 transition-colors text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                          >
                            <span>{subItem.icon}</span>
                            <span>{subItem.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* Expanded submenu - ONLY when a subitem is active */}
                  {hasActiveSubItem && (
                    <ul className="ml-4 mt-1 space-y-1">
                      {item.subItems.map((subItem: any) => {
                        const isSubItemActive = pathname === subItem.href;
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
                {/* User Info */}
                <div className="mb-3 px-4 py-3 bg-gray-800 rounded-lg">
                  {isSwitched && (
                    <div className="mb-3 px-3 py-2 bg-yellow-900 border border-yellow-700 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-yellow-300 text-lg">⚠️</span>
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-yellow-200">Testing Mode</div>
                          <div className="text-xs text-yellow-300">Viewing as another user</div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full ${isSwitched ? 'bg-yellow-600' : 'bg-primary-600'} flex items-center justify-center text-white font-semibold flex-shrink-0`}>
                      {userName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{userName}</div>
                      <div className="text-xs text-gray-400 capitalize">{userRole}</div>
                    </div>
                  </div>
                </div>

                {/* Switch Back Button (when in testing mode) */}
                {isSwitched && (
                  <div className="mb-3">
                    <SwitchBackButton />
                  </div>
                )}

        <Link
          href="/admin/help"
          className={cn(
            'w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors mb-2',
            pathname === '/admin/help'
              ? 'bg-primary-600 text-white'
              : 'text-gray-300 hover:bg-gray-800'
          )}
        >
          <span className="text-xl">❓</span>
          <span>Help</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors mb-2"
        >
          <span className="text-xl">🚪</span>
          <span>Logout</span>
        </button>
        <div className="text-center text-xs text-gray-500 mt-2">
          Next CMS v3.0.0
        </div>
      </div>
    </aside>
  );
}

