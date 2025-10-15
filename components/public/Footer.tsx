import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

async function getSettings() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('site_name', 'site_description')"
    );
    const settings: any = {};
    rows.forEach((row: any) => {
      settings[row.setting_key] = row.setting_value;
    });
    return settings;
  } catch {
    return {
      site_name: 'Next CMS',
      site_description: 'A complete content management system built with Next.js, Tailwind CSS, and MySQL',
    };
  }
}

export default async function Footer() {
  const settings = await getSettings();
  
  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">{settings.site_name || 'Next CMS'}</h3>
            <p className="text-gray-400">
              {settings.site_description || 'A complete content management system built with Next.js, Tailwind CSS, and MySQL.'}
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-400 hover:text-white transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="/blog" className="text-gray-400 hover:text-white transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="/admin" className="text-gray-400 hover:text-white transition-colors">
                  Admin
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">About</h4>
            <p className="text-gray-400">
              {settings.site_description || 'Built with Next.js 14, featuring posts, pages, media management, and rich text editing.'}
            </p>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} {settings.site_name || 'Next CMS'}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

