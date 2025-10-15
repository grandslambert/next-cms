'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Link from 'next/link';

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
  </div>
);

// Skeleton loader for content summary items
const ContentSummarySkeleton = () => (
  <div className="text-center p-4 rounded-lg bg-gray-50 animate-pulse">
    <div className="text-4xl mb-2">⏳</div>
    <div className="h-4 bg-gray-300 rounded w-16 mx-auto mb-2"></div>
    <div className="h-8 bg-gray-300 rounded w-12 mx-auto"></div>
  </div>
);

export default function AdminDashboard() {
  const { data: session } = useSession();

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const res = await axios.get('/api/posts?limit=5');
      return res.data;
    },
  });

  const { data: pagesData, isLoading: pagesLoading } = useQuery({
    queryKey: ['pages'],
    queryFn: async () => {
      const res = await axios.get('/api/pages');
      return res.data;
    },
  });

  const { data: mediaData, isLoading: mediaLoading } = useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      const res = await axios.get('/api/media?limit=5');
      return res.data;
    },
  });

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await axios.get('/api/categories');
      return res.data;
    },
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await axios.get('/api/users');
      return res.data;
    },
  });

  const isContentLoading = postsLoading || pagesLoading || mediaLoading || categoriesLoading || usersLoading;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {session?.user?.name}!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Combined Content Summary Card */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Content Summary</h2>
          </div>
          <div className="p-6">
            {isContentLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {['posts', 'pages', 'media', 'categories', 'users', 'settings'].map((item) => (
                  <ContentSummarySkeleton key={item} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <Link href="/admin/posts" className="group">
                  <div className="text-center p-4 rounded-lg transition-colors hover:bg-gray-50">
                    <div className="text-4xl mb-2">📝</div>
                    <p className="text-sm font-medium text-gray-600 mb-1 group-hover:text-primary-600">Posts</p>
                    <p className="text-2xl font-bold text-gray-900">{postsData?.total || 0}</p>
                  </div>
                </Link>

                <Link href="/admin/pages" className="group">
                  <div className="text-center p-4 rounded-lg transition-colors hover:bg-gray-50">
                    <div className="text-4xl mb-2">📄</div>
                    <p className="text-sm font-medium text-gray-600 mb-1 group-hover:text-primary-600">Pages</p>
                    <p className="text-2xl font-bold text-gray-900">{pagesData?.pages?.length || 0}</p>
                  </div>
                </Link>

                <Link href="/admin/media" className="group">
                  <div className="text-center p-4 rounded-lg transition-colors hover:bg-gray-50">
                    <div className="text-4xl mb-2">🖼️</div>
                    <p className="text-sm font-medium text-gray-600 mb-1 group-hover:text-primary-600">Media</p>
                    <p className="text-2xl font-bold text-gray-900">{mediaData?.total || 0}</p>
                  </div>
                </Link>

                <Link href="/admin/categories" className="group">
                  <div className="text-center p-4 rounded-lg transition-colors hover:bg-gray-50">
                    <div className="text-4xl mb-2">🏷️</div>
                    <p className="text-sm font-medium text-gray-600 mb-1 group-hover:text-primary-600">Categories</p>
                    <p className="text-2xl font-bold text-gray-900">{categoriesData?.categories?.length || 0}</p>
                  </div>
                </Link>

                <Link href="/admin/users" className="group">
                  <div className="text-center p-4 rounded-lg transition-colors hover:bg-gray-50">
                    <div className="text-4xl mb-2">👥</div>
                    <p className="text-sm font-medium text-gray-600 mb-1 group-hover:text-primary-600">Users</p>
                    <p className="text-2xl font-bold text-gray-900">{usersData?.users?.length || 0}</p>
                  </div>
                </Link>

                <Link href="/admin/settings" className="group">
                  <div className="text-center p-4 rounded-lg transition-colors hover:bg-gray-50">
                    <div className="text-4xl mb-2">⚙️</div>
                    <p className="text-sm font-medium text-gray-600 mb-1 group-hover:text-primary-600">Settings</p>
                    <p className="text-2xl font-bold text-gray-900">—</p>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Card */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg shadow text-white p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
          {postsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-primary-100 text-sm">Published Posts</p>
                <p className="text-3xl font-bold">
                  {postsData?.posts?.filter((p: any) => p.status === 'published').length || 0}
                </p>
              </div>
              <div>
                <p className="text-primary-100 text-sm">Draft Posts</p>
                <p className="text-2xl font-semibold">
                  {postsData?.posts?.filter((p: any) => p.status === 'draft').length || 0}
                </p>
              </div>
              <div className="pt-4 border-t border-primary-400">
                <p className="text-primary-100 text-sm mb-2">Your Role</p>
                <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm font-medium capitalize">
                  {(session?.user as any)?.role || 'User'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Posts</h2>
          </div>
          <div className="p-6">
            {postsLoading ? (
              <LoadingSpinner />
            ) : postsData?.posts && postsData.posts.length > 0 ? (
              <ul className="space-y-4">
                {postsData.posts.slice(0, 5).map((post: any) => (
                  <li key={post.id} className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{post.title}</h3>
                      <p className="text-sm text-gray-500">
                        by {post.author_name} • {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      post.status === 'published' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {post.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No posts yet</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Media</h2>
          </div>
          <div className="p-6">
            {mediaLoading ? (
              <LoadingSpinner />
            ) : mediaData?.media && mediaData.media.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {mediaData.media.slice(0, 6).map((item: any) => (
                  <div key={item.id} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    {item.mime_type.startsWith('image/') ? (
                      <img
                        src={item.url}
                        alt={item.original_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        📄
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No media files yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

