import Link from 'next/link';
import { connectDB } from '@/lib/db';
import { Setting } from '@/lib/models';
import { getDefaultSite } from '@/lib/url-utils';
import Menu from './Menu';
import mongoose from 'mongoose';

async function getSiteName() {
  try {
    const site = await getDefaultSite();
    if (!site) return 'Next CMS';

    await connectDB();
    
    const setting = await Setting.findOne({
      site_id: new mongoose.Types.ObjectId(site.id),
      setting_key: 'site_name',
    }).lean();

    return setting?.setting_value || site.name || 'Next CMS';
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
            
            <Menu 
              location="header" 
              linkClassName="text-gray-700 hover:text-primary-600 transition-colors"
            />
          </div>
        </div>
      </nav>
  );
}
