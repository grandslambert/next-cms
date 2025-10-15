import Link from 'next/link';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

async function getSiteName() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT setting_value FROM settings WHERE setting_key = 'site_name'"
    );
    return rows[0]?.setting_value || 'Next CMS';
  } catch {
    return 'Next CMS';
  }
}

export default async function Navbar() {
  const siteName = await getSiteName();
  
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            {siteName}
          </Link>
          
          <div className="flex space-x-8">
            <Link href="/" className="text-gray-700 hover:text-primary-600 transition-colors">
              Home
            </Link>
            <Link href="/blog" className="text-gray-700 hover:text-primary-600 transition-colors">
              Blog
            </Link>
            <Link href="/admin" className="text-gray-700 hover:text-primary-600 transition-colors">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

