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

// Component to display terms for a specific post and taxonomy
function PostTaxonomyTerms({ postId, taxonomyId }: { readonly postId: number; readonly taxonomyId: number }) {
  const { data } = useQuery({
    queryKey: ['post-terms', postId, taxonomyId],
    queryFn: async () => {
      const res = await axios.get(`/api/posts/${postId}/terms?taxonomy_id=${taxonomyId}`);
      return res.data;
    },
  });

  if (!data?.terms || data.terms.length === 0) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <div className="text-sm text-gray-700">
      {data.terms.map((term: any, idx: number) => (
        <span key={term.id}>
          {term.name}
          {idx < data.terms.length - 1 && ', '}
        </span>
      ))}
    </div>
  );
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
  const userId = (session?.user as any)?.id;
  const [statusFilter, setStatusFilter] = useState<string>(searchParams?.get('status') || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    featured_image: true,
    author: true,
    status: true,
    date: true,
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

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

  // Fetch taxonomies assigned to this post type
  const { data: postTypeTaxonomiesData } = useQuery({
    queryKey: ['post-type-taxonomies', postTypeData?.id],
    queryFn: async () => {
      const res = await axios.get(`/api/post-types/${postTypeData.id}/taxonomies`);
      return res.data;
    },
    enabled: !!postTypeData?.id,
  });

  // Load user column preferences
  const { data: userPrefsData } = useQuery({
    queryKey: ['user-meta', `columns_${postTypeSlug}`],
    queryFn: async () => {
      const res = await axios.get(`/api/user/meta?key=columns_${postTypeSlug}`);
      return res.data;
    },
    enabled: !!userId,
  });

  // Load user items per page preference
  const { data: itemsPerPageData } = useQuery({
    queryKey: ['user-meta', `items_per_page_${postTypeSlug}`],
    queryFn: async () => {
      const res = await axios.get(`/api/user/meta?key=items_per_page_${postTypeSlug}`);
      return res.data;
    },
    enabled: !!userId,
  });

  // Update visible columns when user preferences load
  useEffect(() => {
    if (userPrefsData?.meta_value) {
      try {
        const savedColumns = JSON.parse(userPrefsData.meta_value);
        setVisibleColumns(savedColumns);
      } catch (e) {
        console.error('Failed to parse column preferences');
      }
    } else if (postTypeTaxonomiesData?.taxonomies) {
      // Set default visibility for taxonomy columns
      const defaults: Record<string, boolean> = {
        featured_image: true,
        author: true,
        status: true,
        date: true,
      };
      postTypeTaxonomiesData.taxonomies.forEach((tax: any) => {
        defaults[`taxonomy_${tax.id}`] = true;
      });
      setVisibleColumns(defaults);
    }
  }, [userPrefsData, postTypeTaxonomiesData]);

  // Load items per page preference
  useEffect(() => {
    if (itemsPerPageData?.meta_value) {
      setItemsPerPage(parseInt(itemsPerPageData.meta_value));
    }
  }, [itemsPerPageData]);

  // Save column preferences
  const saveColumnPreferences = async (columns: Record<string, boolean>) => {
    try {
      await axios.put('/api/user/meta', {
        meta_key: `columns_${postTypeSlug}`,
        meta_value: JSON.stringify(columns)
      });
    } catch (error) {
      console.error('Failed to save column preferences');
    }
  };

  const toggleColumn = (column: string) => {
    const updated = { ...visibleColumns, [column]: !visibleColumns[column] };
    setVisibleColumns(updated);
    saveColumnPreferences(updated);
  };

  const handleItemsPerPageChange = async (newValue: number) => {
    setItemsPerPage(newValue);
    setCurrentPage(1); // Reset to first page when changing items per page
    try {
      await axios.put('/api/user/meta', {
        meta_key: `items_per_page_${postTypeSlug}`,
        meta_value: newValue.toString()
      });
    } catch (error) {
      console.error('Failed to save items per page preference');
    }
  };

  // Fetch posts of this type
  const { data, isLoading } = useQuery({
    queryKey: ['posts', postTypeSlug, statusFilter, debouncedSearch, itemsPerPage, currentPage],
    queryFn: async () => {
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
      const offset = (currentPage - 1) * itemsPerPage;
      const res = await axios.get(`/api/posts?post_type=${postTypeSlug}&status=${statusFilter}${searchParam}&limit=${itemsPerPage}&offset=${offset}`);
      return res.data;
    },
  });

  // Fetch status counts
  const { data: statusCounts } = useQuery({
    queryKey: ['posts', postTypeSlug, 'counts'],
    queryFn: async () => {
      const [allRes, publishedRes, draftRes, pendingRes, scheduledRes, trashRes] = await Promise.all([
        axios.get(`/api/posts?post_type=${postTypeSlug}&status=all&limit=1`),
        axios.get(`/api/posts?post_type=${postTypeSlug}&status=published&limit=1`),
        axios.get(`/api/posts?post_type=${postTypeSlug}&status=draft&limit=1`),
        axios.get(`/api/posts?post_type=${postTypeSlug}&status=pending&limit=1`),
        axios.get(`/api/posts?post_type=${postTypeSlug}&status=scheduled&limit=1`),
        axios.get(`/api/posts?post_type=${postTypeSlug}&status=trash&limit=1`),
      ]);
      return {
        all: allRes.data.total,
        published: publishedRes.data.total,
        draft: draftRes.data.total,
        pending: pendingRes.data.total,
        scheduled: scheduledRes.data.total,
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

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Clear selected posts and reset page when changing filters
  useEffect(() => {
    setSelectedPosts([]);
    setCurrentPage(1);
  }, [statusFilter]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

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

  // Close column settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showColumnSettings && !target.closest('.column-settings-dropdown')) {
        setShowColumnSettings(false);
      }
    };

    if (showColumnSettings) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColumnSettings]);

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
  let displayPosts = postTypeData?.hierarchical && data?.posts 
    ? buildHierarchy(data.posts)
    : data?.posts || [];

  // Apply column filters (client-side)
  if (Object.keys(columnFilters).some(key => columnFilters[key])) {
    displayPosts = displayPosts.filter((post: any) => {
      // Filter by title
      if (columnFilters.title && !post.title.toLowerCase().includes(columnFilters.title.toLowerCase())) {
        return false;
      }
      
      // Filter by author
      if (columnFilters.author && !post.author_name?.toLowerCase().includes(columnFilters.author.toLowerCase())) {
        return false;
      }
      
      // Filter by status
      if (columnFilters.status && post.status !== columnFilters.status) {
        return false;
      }
      
      // Filter by date
      if (columnFilters.date) {
        const postDate = new Date(post.updated_at).toISOString().split('T')[0];
        if (postDate !== columnFilters.date) {
          return false;
        }
      }
      
      return true;
    });
  }

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
    { value: 'scheduled', label: 'Scheduled', count: statusCounts?.scheduled || 0 },
    { value: 'trash', label: 'Trash', count: statusCounts?.trash || 0 },
  ].filter(tab => tab.count > 0); // Only show tabs with posts

  return (
    <div className="-m-8 h-[calc(100vh-4rem)]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{postTypeData.label}</h1>
          <p className="text-sm text-gray-600">{postTypeData.description}</p>
        </div>
        <div className="flex space-x-2">
          {statusFilter === 'trash' && data?.posts && data.posts.length > 0 && (
            <button
              onClick={handleEmptyTrash}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Empty Trash
            </button>
          )}
          <div className="relative column-settings-dropdown">
            <button
              onClick={() => setShowColumnSettings(!showColumnSettings)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Columns
            </button>
            {showColumnSettings && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Show Columns</h4>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={visibleColumns.featured_image !== false}
                        onChange={() => toggleColumn('featured_image')}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Featured Image</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={visibleColumns.author !== false}
                        onChange={() => toggleColumn('author')}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Author</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={visibleColumns.status !== false}
                        onChange={() => toggleColumn('status')}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Status</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={visibleColumns.date !== false}
                        onChange={() => toggleColumn('date')}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Date</span>
                    </label>
                    {postTypeTaxonomiesData?.taxonomies?.map((taxonomy: any) => (
                      <label key={taxonomy.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={visibleColumns[`taxonomy_${taxonomy.id}`] !== false}
                          onChange={() => toggleColumn(`taxonomy_${taxonomy.id}`)}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{taxonomy.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <Link
            href={`/admin/post-type/${postTypeSlug}/new`}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            + Add New {postTypeData.singular_label}
          </Link>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto h-[calc(100vh-8rem)]">
        <div className="px-8 py-6">

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
            {/* Bulk Actions and Search Bar */}
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
              
              {/* Search Bar */}
              <div className="relative flex-1 ml-auto max-w-md">
                <input
                  type="text"
                  placeholder={`Search ${postTypeData.label.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 pr-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <svg
                  className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Items Per Page Selector */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span>items</span>
              </div>
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
                {visibleColumns.featured_image !== false && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                )}
                {visibleColumns.author !== false && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Author
                  </th>
                )}
                {postTypeTaxonomiesData?.taxonomies?.map((taxonomy: any) => (
                  visibleColumns[`taxonomy_${taxonomy.id}`] !== false && (
                    <th key={taxonomy.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {taxonomy.label}
                    </th>
                  )
                ))}
                {visibleColumns.status !== false && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                )}
                {visibleColumns.date !== false && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                )}
              </tr>
              {/* Filter Row */}
              <tr className="bg-gray-50">
                <th className="px-6 py-2"></th>
                <th className="px-6 py-2"></th>
                <th className="px-6 py-2">
                  <input
                    type="text"
                    placeholder="Filter title..."
                    value={columnFilters.title || ''}
                    onChange={(e) => setColumnFilters({...columnFilters, title: e.target.value})}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </th>
                {visibleColumns.featured_image !== false && (
                  <th className="px-6 py-2"></th>
                )}
                {visibleColumns.author !== false && (
                  <th className="px-6 py-2">
                    <input
                      type="text"
                      placeholder="Filter author..."
                      value={columnFilters.author || ''}
                      onChange={(e) => setColumnFilters({...columnFilters, author: e.target.value})}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </th>
                )}
                {postTypeTaxonomiesData?.taxonomies?.map((taxonomy: any) => (
                  visibleColumns[`taxonomy_${taxonomy.id}`] !== false && (
                    <th key={taxonomy.id} className="px-6 py-2">
                      <input
                        type="text"
                        placeholder={`Filter ${taxonomy.label.toLowerCase()}...`}
                        value={columnFilters[`taxonomy_${taxonomy.id}`] || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, [`taxonomy_${taxonomy.id}`]: e.target.value})}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </th>
                  )
                ))}
                {visibleColumns.status !== false && (
                  <th className="px-6 py-2">
                    <select
                      value={columnFilters.status || ''}
                      onChange={(e) => setColumnFilters({...columnFilters, status: e.target.value})}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">All statuses</option>
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                      <option value="pending">Pending</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="trash">Trash</option>
                    </select>
                  </th>
                )}
                {visibleColumns.date !== false && (
                  <th className="px-6 py-2">
                    <input
                      type="date"
                      placeholder="Filter date..."
                      value={columnFilters.date || ''}
                      onChange={(e) => setColumnFilters({...columnFilters, date: e.target.value})}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </th>
                )}
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
                    {visibleColumns.featured_image !== false && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {post.featured_image_url ? (
                          <img
                            src={post.featured_image_url}
                            alt={post.title}
                            className="h-12 w-12 object-cover rounded"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center">
                            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </td>
                    )}
                    {visibleColumns.author !== false && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{post.author_name}</div>
                      </td>
                    )}
                    {postTypeTaxonomiesData?.taxonomies?.map((taxonomy: any) => (
                      visibleColumns[`taxonomy_${taxonomy.id}`] !== false && (
                        <td key={taxonomy.id} className="px-6 py-4 whitespace-nowrap">
                          <PostTaxonomyTerms postId={post.id} taxonomyId={taxonomy.id} />
                        </td>
                      )
                    ))}
                    {visibleColumns.status !== false && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            post.status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : post.status === 'pending'
                              ? 'bg-blue-100 text-blue-800'
                              : post.status === 'scheduled'
                              ? 'bg-purple-100 text-purple-800'
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
                    )}
                    {visibleColumns.date !== false && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {post.status === 'scheduled' && post.scheduled_publish_at ? (
                          <div>
                            <div>{formatDate(post.scheduled_publish_at)}</div>
                            <div className="text-xs text-gray-400">Scheduled</div>
                          </div>
                        ) : (
                          formatDate(post.updated_at)
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {data && data.total > itemsPerPage && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, data.total)} to {Math.min(currentPage * itemsPerPage, data.total)} of {data.total} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const totalPages = Math.ceil(data.total / itemsPerPage);
                    const pages = [];
                    const maxVisible = 5;
                    
                    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                    let end = Math.min(totalPages, start + maxVisible - 1);
                    
                    if (end - start < maxVisible - 1) {
                      start = Math.max(1, end - maxVisible + 1);
                    }
                    
                    if (start > 1) {
                      pages.push(
                        <button
                          key={1}
                          onClick={() => setCurrentPage(1)}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          1
                        </button>
                      );
                      if (start > 2) {
                        pages.push(<span key="start-ellipsis" className="px-2 text-gray-500">...</span>);
                      }
                    }
                    
                    for (let i = start; i <= end; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          className={`px-3 py-1 border rounded-md text-sm font-medium ${
                            currentPage === i
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                    
                    if (end < totalPages) {
                      if (end < totalPages - 1) {
                        pages.push(<span key="end-ellipsis" className="px-2 text-gray-500">...</span>);
                      }
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => setCurrentPage(totalPages)}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          {totalPages}
                        </button>
                      );
                    }
                    
                    return pages;
                  })()}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(data.total / itemsPerPage), prev + 1))}
                  disabled={currentPage >= Math.ceil(data.total / itemsPerPage)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(Math.ceil(data.total / itemsPerPage))}
                  disabled={currentPage >= Math.ceil(data.total / itemsPerPage)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            </div>
          )}
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
      </div>
    </div>
  );
}

