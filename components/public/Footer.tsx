import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import Menu from './Menu';

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
        <Menu 
          location="footer" 
          className="mb-6"
          linkClassName="text-gray-300 hover:text-white transition-colors"
          submenuClassName="absolute left-0 top-full mt-2 bg-gray-800 shadow-lg rounded-lg py-2 min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10"
        />
        
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} {settings.site_name || 'Next CMS'}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

