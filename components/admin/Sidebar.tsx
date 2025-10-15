'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { cn } from '@/lib/utils';

const staticMenuItems = [
  { name: 'Dashboard', href: '/admin', icon: '📊', position: 0 },
  { name: 'Categories', href: '/admin/categories', icon: '🏷️', position: 15 },
  { name: 'Media', href: '/admin/media', icon: '🖼️', position: 20 },
  { name: 'Users', href: '/admin/users', icon: '👥', position: 25 },
  { name: 'Settings', href: '/admin/settings', icon: '⚙️', position: 30 },
  { name: 'View Site', href: '/', icon: '🌐', external: true, position: 99 },
];

export default function Sidebar() {
  const pathname = usePathname();
  
  // Fetch custom post types
  const { data: postTypesData } = useQuery({
    queryKey: ['post-types'],
    queryFn: async () => {
      const res = await axios.get('/api/post-types');
      return res.data;
    },
  });

  // Build menu items including custom post types
  const menuItems = [...staticMenuItems];
  
  if (postTypesData?.postTypes) {
    postTypesData.postTypes.forEach((postType: any) => {
      menuItems.push({
        name: postType.label,
        href: `/admin/post-type/${postType.name}`,
        icon: postType.icon || '📄',
        position: postType.menu_position || 5,
      });
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
          {menuItems.map((item) => {
            const isActive = item.href === '/admin' 
              ? pathname === item.href
              : pathname?.startsWith(item.href);

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
          Next CMS v1.1.0
        </div>
      </div>
    </aside>
  );
}

