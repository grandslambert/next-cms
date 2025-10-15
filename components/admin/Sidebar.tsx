'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';

const menuItems = [
  { name: 'Dashboard', href: '/admin', icon: '📊' },
  { name: 'Posts', href: '/admin/posts', icon: '📝' },
  { name: 'Pages', href: '/admin/pages', icon: '📄' },
  { name: 'Categories', href: '/admin/categories', icon: '🏷️' },
  { name: 'Media', href: '/admin/media', icon: '🖼️' },
  { name: 'Users', href: '/admin/users', icon: '👥' },
  { name: 'View Site', href: '/', icon: '🌐', external: true },
];

export default function Sidebar() {
  const pathname = usePathname();

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
          Next CMS v1.0.0
        </div>
      </div>
    </aside>
  );
}

