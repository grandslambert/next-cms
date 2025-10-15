'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface Post {
  id: number;
  post_type: string;
  title: string;
  slug: string;
  status: string;
  author_id: number;
  author_name: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  parent_id: number | null;
  menu_order: number;
}

// Build hierarchical URL for a post
function buildHierarchicalUrl(post: Post, allPosts: Post[], postType: any): string {
  const baseSlug = postType?.slug || '';
  const basePath = baseSlug ? `/${baseSlug}` : '';
  
  // Build slug path including parents
  const slugPath: string[] = [post.slug];
  let currentParentId = post.parent_id;
  let iterations = 0;
  
  while (currentParentId && iterations < 10) {
    const parent = allPosts.find((p: Post) => p.id === currentParentId);
    if (!parent) break;
    slugPath.unshift(parent.slug);
    currentParentId = parent.parent_id;
    iterations++;
  }
  
  // Add date components if needed
  if (post.published_at && postType?.url_structure !== 'default') {
    const date = new Date(post.published_at);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    switch (postType.url_structure) {
      case 'year':
        return `${basePath}/${year}/${slugPath.join('/')}`;
      case 'year_month':
        return `${basePath}/${year}/${month}/${slugPath.join('/')}`;
      case 'year_month_day':
        return `${basePath}/${year}/${month}/${day}/${slugPath.join('/')}`;
    }
  }
  
  return basePath ? `${basePath}/${slugPath.join('/')}` : `/${slugPath.join('/')}`;
}

export default function PostTypePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const postTypeSlug = params?.slug as string;
  const queryClient = useQueryClient();
  const permissions = (session?.user as any)?.permissions || {};
  const [statusFilter, setStatusFilter] = useState<string>(searchParams?.get('status') || 'all');
  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');

  // Check permission for this specific post type
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.push('/admin/login');
      return;
    }
    const hasPermission = permissions[`manage_posts_${postTypeSlug}`];
    if (!hasPermission) {
      router.push('/admin');
    }
  }, [session, sessionStatus, permissions, postTypeSlug, router]);

  // Fetch post type info
  const { data: postTypeData } = useQuery({
    queryKey: ['post-type', postTypeSlug],
    queryFn: async () => {
      const res = await axios.get('/api/post-types');
      const postType = res.data.postTypes.find((pt: any) => pt.name === postTypeSlug);
      return postType;
    },
  });

  // Fetch posts of this type
  const { data, isLoading } = useQuery({
    queryKey: ['posts', postTypeSlug, statusFilter],
    queryFn: async () => {
      const res = await axios.get(`/api/posts?post_type=${postTypeSlug}&status=${statusFilter}`);
      return res.data;
    },
  });

  // Fetch status counts
  const { data: statusCounts } = useQuery({
    queryKey: ['posts', postTypeSlug, 'counts'],
    queryFn: async () => {
      const [allRes, publishedRes, draftRes, pendingRes, trashRes] = await Promise.all([
        axios.get(`/api/posts?post_type=${postTypeSlug}&status=all&limit=1`),
        axios.get(`/api/posts?post_type=${postTypeSlug}&status=published&limit=1`),
        axios.get(`/api/posts?post_type=${postTypeSlug}&status=draft&limit=1`),
        axios.get(`/api/posts?post_type=${postTypeSlug}&status=pending&limit=1`),
        axios.get(`/api/posts?post_type=${postTypeSlug}&status=trash&limit=1`),
      ]);
      return {
        all: allRes.data.total,
        published: publishedRes.data.total,
        draft: draftRes.data.total,
        pending: pendingRes.data.total,
        trash: trashRes.data.total,
      };
    },
  });

  const invalidatePostQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['posts', postTypeSlug] });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`/api/posts/${id}`);
    },
    onSuccess: () => {
      invalidatePostQueries();
      toast.success(`${postTypeData?.singular_label || 'Item'} moved to trash`);
    },
    onError: () => {
      toast.error(`Failed to delete ${postTypeData?.singular_label?.toLowerCase() || 'item'}`);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.post(`/api/posts/${id}/restore`);
    },
    onSuccess: () => {
      invalidatePostQueries();
      toast.success(`${postTypeData?.singular_label || 'Item'} restored successfully`);
    },
    onError: () => {
      toast.error(`Failed to restore ${postTypeData?.singular_label?.toLowerCase() || 'item'}`);
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`/api/posts/${id}/permanent-delete`);
    },
    onSuccess: () => {
      invalidatePostQueries();
      toast.success(`${postTypeData?.singular_label || 'Item'} permanently deleted`);
    },
    onError: () => {
      toast.error(`Failed to permanently delete ${postTypeData?.singular_label?.toLowerCase() || 'item'}`);
    },
  });

  const emptyTrashMutation = useMutation({
    mutationFn: async () => {
      await axios.delete('/api/posts/trash/empty');
    },
    onSuccess: (response) => {
      invalidatePostQueries();
      toast.success(`Trash emptied: ${response.data.deleted_count} items deleted`);
    },
    onError: () => {
      toast.error('Failed to empty trash');
    },
  });

  const handleDelete = (id: number, title: string) => {
    if (confirm(`Are you sure you want to move "${title}" to trash?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleRestore = (id: number, title: string) => {
    if (confirm(`Are you sure you want to restore "${title}"?`)) {
      restoreMutation.mutate(id);
    }
  };

  const handlePermanentDelete = (id: number, title: string) => {
    if (confirm(`Are you sure you want to PERMANENTLY delete "${title}"? This action cannot be undone.`)) {
      permanentDeleteMutation.mutate(id);
    }
  };

  const handleEmptyTrash = () => {
    if (confirm('Are you sure you want to PERMANENTLY delete all items in trash? This action cannot be undone.')) {
      emptyTrashMutation.mutate();
    }
  };

  // Bulk actions mutations
  const bulkTrashMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => axios.delete(`/api/posts/${id}`)));
    },
    onSuccess: () => {
      invalidatePostQueries();
      setSelectedPosts([]);
      toast.success(`${selectedPosts.length} items moved to trash`);
    },
    onError: () => {
      toast.error('Failed to move items to trash');
    },
  });

  const bulkRestoreMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => axios.post(`/api/posts/${id}/restore`)));
    },
    onSuccess: () => {
      invalidatePostQueries();
      setSelectedPosts([]);
      toast.success(`${selectedPosts.length} items restored`);
    },
    onError: () => {
      toast.error('Failed to restore items');
    },
  });

  const bulkPermanentDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => axios.delete(`/api/posts/${id}/permanent-delete`)));
    },
    onSuccess: () => {
      invalidatePostQueries();
      setSelectedPosts([]);
      toast.success(`${selectedPosts.length} items permanently deleted`);
    },
    onError: () => {
      toast.error('Failed to permanently delete items');
    },
  });

  // Handle bulk action
  const handleBulkAction = () => {
    if (selectedPosts.length === 0) {
      toast.error('Please select at least one item');
      return;
    }

    if (!bulkAction) {
      toast.error('Please select an action');
      return;
    }

    switch (bulkAction) {
      case 'trash':
        if (confirm(`Move ${selectedPosts.length} items to trash?`)) {
          bulkTrashMutation.mutate(selectedPosts);
        }
        break;
      case 'restore':
        if (confirm(`Restore ${selectedPosts.length} items?`)) {
          bulkRestoreMutation.mutate(selectedPosts);
        }
        break;
      case 'delete':
        if (confirm(`PERMANENTLY delete ${selectedPosts.length} items? This action cannot be undone.`)) {
          bulkPermanentDeleteMutation.mutate(selectedPosts);
        }
        break;
    }

    setBulkAction('');
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = displayPosts.map((post: Post) => post.id);
      setSelectedPosts(allIds);
    } else {
      setSelectedPosts([]);
    }
  };

  // Handle individual checkbox
  const handleCheckbox = (postId: number, checked: boolean) => {
    if (checked) {
      setSelectedPosts([...selectedPosts, postId]);
    } else {
      setSelectedPosts(selectedPosts.filter(id => id !== postId));
    }
  };

  // Clear selected posts when changing filters
  useEffect(() => {
    setSelectedPosts([]);
  }, [statusFilter]);

  // If current filter has no posts, switch to first available tab
  useEffect(() => {
    if (statusCounts) {
      const currentFilterCount = statusCounts[statusFilter as keyof typeof statusCounts];
      if (currentFilterCount === 0) {
        const firstAvailableTab = Object.entries(statusCounts).find(([key, count]) => count > 0);
        if (firstAvailableTab) {
          setStatusFilter(firstAvailableTab[0]);
        }
      }
    }
  }, [statusCounts, statusFilter]);

  // Build hierarchical tree for display
  const buildHierarchy = (posts: Post[], parentId: number | null = null, level: number = 0): any[] => {
    const children: any[] = [];
    
    posts
      .filter((post: any) => (post.parent_id || null) === parentId)
      .sort((a: any, b: any) => (a.menu_order || 0) - (b.menu_order || 0))
      .forEach(post => {
        children.push({ ...post, level });
        children.push(...buildHierarchy(posts, post.id, level + 1));
      });
    
    return children;
  };

  // Get posts in hierarchical order if needed
  const displayPosts = postTypeData?.hierarchical && data?.posts 
    ? buildHierarchy(data.posts)
    : data?.posts || [];

  if (sessionStatus === 'loading' || !postTypeData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statusTabs = [
    { value: 'all', label: 'All', count: statusCounts?.all || 0 },
    { value: 'published', label: 'Published', count: statusCounts?.published || 0 },
    { value: 'draft', label: 'Draft', count: statusCounts?.draft || 0 },
    { value: 'pending', label: 'Pending', count: statusCounts?.pending || 0 },
    { value: 'trash', label: 'Trash', count: statusCounts?.trash || 0 },
  ].filter(tab => tab.count > 0); // Only show tabs with posts

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{postTypeData.label}</h1>
          <p className="text-gray-600 mt-2">{postTypeData.description}</p>
        </div>
        <div className="flex gap-2">
          {statusFilter === 'trash' && data?.posts && data.posts.length > 0 && (
            <button
              onClick={handleEmptyTrash}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Empty Trash
            </button>
          )}
          <Link
            href={`/admin/post-type/${postTypeSlug}/new`}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            + Add New {postTypeData.singular_label}
          </Link>
        </div>
      </div>

      {/* Status Filter Tabs */}
      {statusTabs.length > 0 && (
        <div className="mb-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`${
                  statusFilter === tab.value
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                {tab.label} <span className="ml-1 text-gray-400">({tab.count})</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : data?.posts && data.posts.length > 0 ? (
          <>
            {/* Bulk Actions Bar */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center gap-4">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Bulk Actions</option>
                {statusFilter === 'trash' ? (
                  <>
                    <option value="restore">Restore</option>
                    <option value="delete">Delete Permanently</option>
                  </>
                ) : (
                  <option value="trash">Move to Trash</option>
                )}
              </select>
              <button
                onClick={handleBulkAction}
                disabled={selectedPosts.length === 0}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Apply
              </button>
              {selectedPosts.length > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedPosts.length} item{selectedPosts.length !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>

            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={displayPosts.length > 0 && selectedPosts.length === displayPosts.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayPosts.map((post: any) => {
                const isOwner = post.author_id === parseInt((session?.user as any)?.id);
                const canEdit = isOwner || permissions.manage_others_posts;
                const canDelete = (isOwner && permissions.can_delete) || (!isOwner && permissions.can_delete_others);
                const isTrash = post.status === 'trash';
                
                return (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedPosts.includes(post.id)}
                        onChange={(e) => handleCheckbox(post.id, e.target.checked)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      {isTrash ? (
                        <>
                          {canDelete && (
                            <button
                              onClick={() => handleRestore(post.id, post.title)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Restore
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handlePermanentDelete(post.id, post.title)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete Permanently
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          {canEdit ? (
                            <Link
                              href={`/admin/post-type/${postTypeSlug}/${post.id}`}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              Edit
                            </Link>
                          ) : (
                            <span className="text-gray-400 cursor-not-allowed" title="You don't have permission to edit this post">
                              Edit
                            </span>
                          )}
                          {post.status === 'published' && post.slug && (
                            <a
                              href={buildHierarchicalUrl(post, data.posts, postTypeData)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-900"
                            >
                              View
                            </a>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(post.id, post.title)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Trash
                            </button>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {canEdit && !isTrash ? (
                        <Link
                          href={`/admin/post-type/${postTypeSlug}/${post.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-primary-600 flex items-center"
                        >
                          {!!postTypeData.hierarchical && post.level > 0 && (
                            <span className="text-gray-400 mr-2">
                              {'—'.repeat(post.level)} 
                            </span>
                          )}
                          <span>{post.title}</span>
                        </Link>
                      ) : (
                        <div className="text-sm font-medium text-gray-900 flex items-center">
                          {!!postTypeData.hierarchical && post.level > 0 && (
                            <span className="text-gray-400 mr-2">
                              {'—'.repeat(post.level)} 
                            </span>
                          )}
                          <span>{post.title}</span>
                        </div>
                      )}
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{post.author_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        post.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : post.status === 'pending'
                          ? 'bg-blue-100 text-blue-800'
                          : post.status === 'trash'
                          ? 'bg-red-100 text-red-800'
                          : post.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {post.status === 'pending' ? 'Pending Review' : post.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(post.updated_at)}
                  </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-4">No {postTypeData.label.toLowerCase()} yet</p>
            <Link
              href={`/admin/post-type/${postTypeSlug}/new`}
              className="text-primary-600 hover:text-primary-700"
            >
              Create your first {postTypeData.singular_label.toLowerCase()}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

