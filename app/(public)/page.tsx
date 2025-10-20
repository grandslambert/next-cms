import Link from 'next/link';
import { connectDB } from '@/lib/db';
import { Setting, Post, Media } from '@/lib/models';
import { getDefaultSite } from '@/lib/url-utils';
import { formatDate, truncate } from '@/lib/utils';
import { buildPostUrl } from '@/lib/post-url-builder';
import mongoose from 'mongoose';

async function getSettings() {
  try {
    const site = await getDefaultSite();
    if (!site) {
      return {
        site_name: 'Next CMS',
        site_tagline: 'A powerful content management system',
      };
    }

    await connectDB();
    
    const settings = await Setting.find({
      site_id: new mongoose.Types.ObjectId(site.id),
      setting_key: { $in: ['site_name', 'site_tagline'] },
    }).lean();

    const result: any = {};
    settings.forEach((setting) => {
      result[setting.setting_key] = setting.setting_value;
    });

    return {
      site_name: result.site_name || site.name || 'Next CMS',
      site_tagline: result.site_tagline || 'A powerful content management system',
    };
  } catch (error) {
    console.error('Error fetching settings:', error);
    return {
      site_name: 'Next CMS',
      site_tagline: 'A powerful content management system',
    };
  }
}

async function getRecentPosts() {
  try {
    const site = await getDefaultSite();
    if (!site) return [];

    await connectDB();
    
    const posts = await Post.find({
      site_id: new mongoose.Types.ObjectId(site.id),
      status: 'published',
    })
      .sort({ published_at: -1 })
      .limit(6)
      .populate('author_id', 'username email')
      .populate('featured_image_id')
      .lean();

    const postsWithUrls = await Promise.all(posts.map(async (post) => {
      const url = await buildPostUrl(post._id.toString(), site.id);
      const featuredImage = post.featured_image_id as any;
      
      return {
        ...post,
        id: post._id.toString(),
        author_name: (post.author_id as any)?.username || 'Unknown',
        featured_image: featuredImage?.filepath || null,
        url,
      };
    }));

    return postsWithUrls;
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

export default async function HomePage() {
  const [posts, settings] = await Promise.all([
    getRecentPosts(),
    getSettings(),
  ]);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">Welcome to {settings.site_name || 'Next CMS'}</h1>
            <p className="text-xl mb-8 text-primary-100">
              {settings.site_tagline || 'A powerful content management system built with Next.js and MongoDB'}
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/blog"
                className="px-6 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                View Blog
              </Link>
              <Link
                href="/admin"
                className="px-6 py-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-400 transition-colors"
              >
                Admin Panel
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Features</h2>
            <p className="text-gray-600">Everything you need to manage your content</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-xl font-semibold mb-2">Posts & Pages</h3>
              <p className="text-gray-600">
                Create and manage blog posts and static pages with ease using our rich text editor.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-4xl mb-4">🏷️</div>
              <h3 className="text-xl font-semibold mb-2">Taxonomies</h3>
              <p className="text-gray-600">
                Organize your content with categories and tags, or create custom taxonomies.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-4xl mb-4">📁</div>
              <h3 className="text-xl font-semibold mb-2">Media Library</h3>
              <p className="text-gray-600">
                Upload and manage images and files with our intuitive media library.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold mb-2">Custom Post Types</h3>
              <p className="text-gray-600">
                Create custom content types with their own fields and taxonomies.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold mb-2">Multi-Site</h3>
              <p className="text-gray-600">
                Manage multiple websites from a single admin panel with ease.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-4xl mb-4">🔐</div>
              <h3 className="text-xl font-semibold mb-2">User Roles</h3>
              <p className="text-gray-600">
                Control access with granular user roles and permissions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Posts */}
      {posts.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">Latest Posts</h2>
              <Link
                href="/blog"
                className="text-primary-600 hover:text-primary-700 font-semibold"
              >
                View All →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post: any) => (
                <article key={post.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {post.featured_image && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2">
                      <Link href={post.url} className="hover:text-primary-600 transition-colors">
                        {post.title}
                      </Link>
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {truncate(post.excerpt || '', 120)}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{post.author_name}</span>
                      <time>{formatDate(post.published_at)}</time>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
