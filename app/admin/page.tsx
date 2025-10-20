'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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

// Component to fetch and display count for a specific post type
const PostTypeCount = ({ postType }: { postType: string }) => {
  const { data } = useQuery({
    queryKey: ['posts', postType, 'count'],
    queryFn: async () => {
      const res = await axios.get(`/api/posts?post_type=${postType}&limit=1`);
      return res.data;
    },
  });

  return <p className="text-2xl font-bold text-gray-900">{data?.total || 0}</p>;
};

// Component to fetch and display count for a specific taxonomy
const TaxonomyCount = ({ taxonomyId }: { taxonomyId: number }) => {
  const { data } = useQuery({
    queryKey: ['terms', taxonomyId, 'count'],
    queryFn: async () => {
      const res = await axios.get(`/api/terms?taxonomy_id=${taxonomyId}&limit=1`);
      return res.data;
    },
  });

  return <p className="text-2xl font-bold text-gray-900">{data?.terms?.length || 0}</p>;
};

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const permissions = (session?.user as any)?.permissions || {};
  const isSuperAdmin = (session?.user as any)?.isSuperAdmin || false;

  // Redirect super admins to Sites management
  useEffect(() => {
    if (isSuperAdmin) {
      router.push('/admin/sites');
    }
  }, [isSuperAdmin, router]);

  // Redirect guests away from admin (no dashboard access)
  const role = (session?.user as any)?.role;
  useEffect(() => {
    if (role === 'guest') {
      router.push('/');
    }
  }, [role, router]);

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['recent-posts-all-types'],
    queryFn: async () => {
      const res = await axios.get('/api/posts?post_type=all&limit=10');
      return res.data;
    },
  });

  const { data: mediaData, isLoading: mediaLoading } = useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      const res = await axios.get('/api/media?limit=12');
      return res.data;
    },
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await axios.get('/api/users');
      return res.data;
    },
    enabled: isSuperAdmin || !!permissions.manage_users,
  });

  const { data: postTypesData, isLoading: postTypesLoading } = useQuery({
    queryKey: ['post-types'],
    queryFn: async () => {
      const res = await axios.get('/api/post-types');
      return res.data;
    },
  });

  const { data: taxonomiesData, isLoading: taxonomiesLoading } = useQuery({
    queryKey: ['taxonomies'],
    queryFn: async () => {
      const res = await axios.get('/api/taxonomies');
      return res.data;
    },
  });

  // Filter post types to show in dashboard based on user permissions
  const dashboardPostTypes = postTypesData?.postTypes?.filter((pt: any) => {
    // Super admin can see all post types
    if (isSuperAdmin) return pt.show_in_dashboard;
    const hasPermission = permissions[`manage_posts_${pt.name}`];
    return pt.show_in_dashboard && hasPermission;
  }) || [];

  // Filter taxonomies to show in dashboard based on user permissions
  const dashboardTaxonomies = taxonomiesData?.taxonomies?.filter((tax: any) => {
    // Super admin can see all taxonomies
    if (isSuperAdmin) return tax.show_in_dashboard;
    const hasPermission = permissions.manage_taxonomies;
    return tax.show_in_dashboard && hasPermission;
  }) || [];

  const isContentLoading = postsLoading || mediaLoading || usersLoading || postTypesLoading || taxonomiesLoading;

  return (
    <div className="-m-8 h-[calc(100vh-4rem)]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-600">Welcome back, {session?.user?.name}!</p>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto h-[calc(100vh-8rem)]">
        <div className="px-8 py-6">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Combined Content Summary Card */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Content Summary</h2>
          </div>
          <div className="p-6">
            {isContentLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <ContentSummarySkeleton key={item} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
                {/* Dynamic Post Types (filtered by show_in_dashboard and permissions) */}
                {dashboardPostTypes.map((postType: any) => (
                  <Link key={postType.name} href={`/admin/post-type/${postType.name}`} className="group">
                    <div className="text-center p-4 rounded-lg transition-colors hover:bg-gray-50">
                      <div className="text-4xl mb-2">{postType.icon}</div>
                      <p className="text-sm font-medium text-gray-600 mb-1 group-hover:text-primary-600">{postType.label}</p>
                      <PostTypeCount postType={postType.name} />
                    </div>
                  </Link>
                ))}

                {/* Dynamic Taxonomies (filtered by show_in_dashboard and permissions) */}
                {dashboardTaxonomies.map((taxonomy: any) => (
                  <Link key={taxonomy.name} href={`/admin/taxonomy/${taxonomy.name}`} className="group">
                    <div className="text-center p-4 rounded-lg transition-colors hover:bg-gray-50">
                      <div className="text-4xl mb-2">{taxonomy.hierarchical ? '🏷️' : '🔖'}</div>
                      <p className="text-sm font-medium text-gray-600 mb-1 group-hover:text-primary-600">{taxonomy.label}</p>
                      <TaxonomyCount taxonomyId={taxonomy.id} />
                    </div>
                  </Link>
                ))}

                {(isSuperAdmin || permissions.manage_media) && (
                  <Link href="/admin/media" className="group">
                    <div className="text-center p-4 rounded-lg transition-colors hover:bg-gray-50">
                      <div className="text-4xl mb-2">🖼️</div>
                      <p className="text-sm font-medium text-gray-600 mb-1 group-hover:text-primary-600">Media</p>
                      <p className="text-2xl font-bold text-gray-900">{mediaData?.total || 0}</p>
                    </div>
                  </Link>
                )}

                {(isSuperAdmin || permissions.manage_users) && (
                  <Link href="/admin/users" className="group">
                    <div className="text-center p-4 rounded-lg transition-colors hover:bg-gray-50">
                      <div className="text-4xl mb-2">👥</div>
                      <p className="text-sm font-medium text-gray-600 mb-1 group-hover:text-primary-600">Users</p>
                      <p className="text-2xl font-bold text-gray-900">{usersData?.users?.length || 0}</p>
                    </div>
                  </Link>
                )}
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
            <h2 className="text-xl font-semibold text-gray-900">Recent Content</h2>
          </div>
          <div className="p-6">
            {postsLoading || postTypesLoading ? (
              <LoadingSpinner />
            ) : (() => {
              // Filter posts by user permissions
              const filteredPosts = postsData?.posts?.filter((post: any) => {
                // Super admin can see all posts
                if (isSuperAdmin) return true;
                return permissions[`manage_posts_${post.post_type}`];
              }) || [];

              // Get post types with menu_order for sorting
              const postTypeMap = new Map(
                postTypesData?.postTypes?.map((pt: any) => [pt.name, pt]) || []
              );

              // Sort by created_at (most recent first)
              const sortedPosts = [...filteredPosts].sort((a: any, b: any) => {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              });

              return sortedPosts.length > 0 ? (
                <ul className="space-y-2">
                  {sortedPosts.slice(0, 8).map((post: any) => {
                    const postType = postTypeMap.get(post.post_type) as any;
                    const postTypeLabel = (postType?.labels?.singular_name || post.post_type).toUpperCase();
                    return (
                      <li key={post.id} className="p-3 rounded-lg hover:bg-gray-50 transition-colors duration-150">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 text-xs font-bold bg-gray-200 text-gray-700 rounded">
                                {postTypeLabel}
                              </span>
                              <span className={`px-2 py-0.5 text-xs font-bold rounded whitespace-nowrap ${
                                post.status === 'published' 
                                  ? 'bg-green-100 text-green-800' 
                                  : post.status === 'pending'
                                  ? 'bg-blue-100 text-blue-800'
                                  : post.status === 'draft'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : post.status === 'scheduled'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {post.status.toUpperCase()}
                              </span>
                            </div>
                            <Link 
                              href={`/admin/post-type/${post.post_type}/${post.id}`}
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline block"
                            >
                              {post.title}
                            </Link>
                            <p className="text-sm text-gray-500 mt-1">
                              by {post.author_name} • {new Date(post.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-gray-500">No posts yet</p>
              );
            })()}
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
              <div className="grid grid-cols-4 gap-4">
                {mediaData.media.slice(0, 12).map((item: any) => (
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
      </div>
    </div>
  );
}

