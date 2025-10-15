'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const settingsTabs = [
  { name: 'General', href: '/admin/settings', exact: true },
  { name: 'Media', href: '/admin/settings/media' },
  { name: 'Post Types', href: '/admin/settings/post-types' },
  { name: 'Taxonomies', href: '/admin/settings/taxonomies' },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Configure your CMS</p>
      </div>

      <div className="mb-6">
        <nav className="flex space-x-4 border-b border-gray-200">
          {settingsTabs.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname?.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'px-4 py-3 font-medium text-sm border-b-2 transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                )}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div>{children}</div>
    </div>
  );
}

