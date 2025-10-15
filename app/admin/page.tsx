'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export default function AdminDashboard() {
  const { data: session } = useSession();

  const { data: postsData } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const res = await axios.get('/api/posts?limit=5');
      return res.data;
    },
  });

  const { data: pagesData } = useQuery({
    queryKey: ['pages'],
    queryFn: async () => {
      const res = await axios.get('/api/pages');
      return res.data;
    },
  });

  const { data: mediaData } = useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      const res = await axios.get('/api/media?limit=5');
      return res.data;
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {session?.user?.name}!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Posts</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {postsData?.total || 0}
              </p>
            </div>
            <div className="text-4xl">📝</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Pages</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {pagesData?.pages?.length || 0}
              </p>
            </div>
            <div className="text-4xl">📄</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Media Files</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {mediaData?.total || 0}
              </p>
            </div>
            <div className="text-4xl">🖼️</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Posts</h2>
          </div>
          <div className="p-6">
            {postsData?.posts && postsData.posts.length > 0 ? (
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
            {mediaData?.media && mediaData.media.length > 0 ? (
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

