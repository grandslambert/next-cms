import Link from 'next/link';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { formatDate, truncate } from '@/lib/utils';
import { getImageUrl } from '@/lib/image-utils';

async function getSettings() {
  try {
    const [rows] = await db.query<RowDataPacket[]>('SELECT * FROM settings');
    const settings: any = {};
    rows.forEach((row: any) => {
      settings[row.setting_key] = row.setting_value;
    });
    return settings;
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
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as author_name,
              m.url as featured_image, m.sizes as featured_image_sizes
       FROM posts p 
       LEFT JOIN users u ON p.author_id = u.id
       LEFT JOIN media m ON p.featured_image_id = m.id
       WHERE p.status = 'published'
       ORDER BY p.published_at DESC
       LIMIT 6`
    );
    return rows;
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

export default async function HomePage() {
  const posts = await getRecentPosts();
  const settings = await getSettings();

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">Welcome to {settings.site_name || 'Next CMS'}</h1>
            <p className="text-xl mb-8 text-primary-100">
              {settings.site_tagline || 'A powerful content management system built with Next.js, Tailwind CSS, and MySQL'}
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
              <div className="text-4xl mb-4">🖼️</div>
              <h3 className="text-xl font-semibold mb-2">Media Library</h3>
              <p className="text-gray-600">
                Upload and organize images and files with a beautiful media management interface.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-4xl mb-4">🔐</div>
              <h3 className="text-xl font-semibold mb-2">Secure Authentication</h3>
              <p className="text-gray-600">
                Built-in authentication system to keep your content safe and secure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Posts Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Latest Posts</h2>
              <p className="text-gray-600">Check out our recent blog posts</p>
            </div>
            <Link
              href="/blog"
              className="text-primary-600 hover:text-primary-700 font-semibold"
            >
              View All →
            </Link>
          </div>

          {posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post: any) => (
                <article key={post.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {post.featured_image && (
                    <div className="aspect-video bg-gray-200">
                      <img
                        src={getImageUrl(post.featured_image, post.featured_image_sizes, 'medium')}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="text-sm text-gray-500 mb-2">
                      {formatDate(post.published_at)}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      <Link href={`/blog/${post.slug}`} className="hover:text-primary-600">
                        {post.title}
                      </Link>
                    </h3>
                    {post.excerpt && (
                      <p className="text-gray-600 mb-4">
                        {truncate(post.excerpt, 120)}
                      </p>
                    )}
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-primary-600 hover:text-primary-700 font-semibold"
                    >
                      Read More →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No posts yet. Create your first post in the admin panel!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

