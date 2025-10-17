import Link from 'next/link';
import { getMenuByLocation } from '@/lib/menu-helpers';

interface MenuProps {
  location: string;
  siteId?: number;
  className?: string;
  itemClassName?: string;
  linkClassName?: string;
  submenuClassName?: string;
}

export default async function Menu({
  location,
  siteId = 1, // Default to site 1 for public-facing menus
  className = '',
  itemClassName = '',
  linkClassName = 'hover:text-primary-600 transition-colors',
  submenuClassName = 'absolute left-0 top-full mt-2 bg-white shadow-lg rounded-lg py-2 min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10',
}: MenuProps) {
  const menuItems = await getMenuByLocation(location, siteId);

  if (!menuItems.length) {
    return null;
  }

  // Filter only top-level items
  const topLevelItems = menuItems.filter(item => !item.parent_id || item.parent_id === 0);

  // Get children for a parent item
  const getChildren = (parentId: number) => {
    return menuItems.filter(item => item.parent_id === parentId);
  };

  return (
    <nav className={className}>
      <ul className="flex gap-6">
        {topLevelItems.map((item) => {
          const children = getChildren(item.id);
          const hasChildren = children.length > 0;
          const classes = item.css_classes ? ` ${item.css_classes}` : '';

          return (
            <li key={item.id} className={`relative group${classes} ${itemClassName}`}>
              <Link
                href={item.url}
                target={item.target}
                rel={item.xfn || undefined}
                title={item.title_attr || undefined}
                className={linkClassName}
              >
                {item.label}
              </Link>
              
              {hasChildren && (
                <ul className={submenuClassName}>
                  {children.map((child) => {
                    const childClasses = child.css_classes ? ` ${child.css_classes}` : '';
                    return (
                      <li key={child.id} className={childClasses}>
                        <Link
                          href={child.url}
                          target={child.target}
                          rel={child.xfn || undefined}
                          title={child.title_attr || undefined}
                          className="block px-4 py-2 hover:bg-gray-100 text-gray-700 transition-colors"
                        >
                          {child.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

