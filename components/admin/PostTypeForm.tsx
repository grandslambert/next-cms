'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import RichTextEditor from '@/components/admin/RichTextEditor';
import CategorySelector from '@/components/admin/CategorySelector';
import MediaSelector from '@/components/admin/MediaSelector';

interface PostTypeFormProps {
  postTypeSlug: string;
  postId?: string;
  isEdit?: boolean;
}

export default function PostTypeForm({ postTypeSlug, postId, isEdit = false }: PostTypeFormProps) {
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [status, setStatus] = useState('draft');
  const [parentId, setParentId] = useState<number | null>(null);
  const [menuOrder, setMenuOrder] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [featuredImageId, setFeaturedImageId] = useState<number | null>(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [showMediaModal, setShowMediaModal] = useState(false);

  // Fetch post type info
  const { data: postTypeData } = useQuery({
    queryKey: ['post-type', postTypeSlug],
    queryFn: async () => {
      const res = await axios.get('/api/post-types');
      const postType = res.data.postTypes.find((pt: any) => pt.name === postTypeSlug);
      return postType;
    },
  });

  // Fetch post data (edit mode only)
  const { data, isLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const res = await axios.get(`/api/posts/${postId}`);
      return res.data;
    },
    enabled: isEdit && !!postId,
  });

  // Fetch categories for this post (edit mode only)
  const { data: categoriesData } = useQuery({
    queryKey: ['post-categories', postId],
    queryFn: async () => {
      const res = await axios.get(`/api/posts/${postId}/categories`);
      return res.data;
    },
    enabled: isEdit && !!postId && !!postTypeData?.supports?.categories,
  });

  // Fetch all posts of this type for parent selector (if hierarchical)
  const { data: allPostsData } = useQuery({
    queryKey: ['posts', postTypeSlug, 'all'],
    queryFn: async () => {
      const res = await axios.get(`/api/posts?post_type=${postTypeSlug}&limit=1000`);
      return res.data;
    },
    enabled: !!postTypeData?.hierarchical,
  });

  // Load post data
  useEffect(() => {
    if (data?.post) {
      setTitle(data.post.title || '');
      setContent(data.post.content || '');
      setExcerpt(data.post.excerpt || '');
      setStatus(data.post.status || 'draft');
      setParentId(data.post.parent_id || null);
      setMenuOrder(data.post.menu_order || 0);
      setFeaturedImageId(data.post.featured_image_id || null);
      setFeaturedImageUrl(data.post.featured_image_url || '');
    }
  }, [data]);

  useEffect(() => {
    if (categoriesData?.categories) {
      setSelectedCategories(categoriesData.categories.map((c: any) => c.id));
    }
  }, [categoriesData]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await axios.post('/api/posts', data);
      const newPostId = res.data.post.id;

      if (postTypeData?.supports?.categories && selectedCategories.length > 0) {
        await axios.put(`/api/posts/${newPostId}/categories`, {
          categoryIds: selectedCategories,
        });
      }

      return res.data;
    },
    onSuccess: () => {
      toast.success(`${postTypeData?.singular_label || 'Item'} created successfully`);
      router.push(`/admin/post-type/${postTypeSlug}`);
    },
    onError: () => {
      toast.error(`Failed to create ${postTypeData?.singular_label?.toLowerCase() || 'item'}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await axios.put(`/api/posts/${postId}`, data);

      if (postTypeData?.supports?.categories) {
        await axios.put(`/api/posts/${postId}/categories`, {
          categoryIds: selectedCategories,
        });
      }
    },
    onSuccess: () => {
      toast.success(`${postTypeData?.singular_label || 'Item'} updated successfully`);
      router.push(`/admin/post-type/${postTypeSlug}`);
    },
    onError: () => {
      toast.error(`Failed to update ${postTypeData?.singular_label?.toLowerCase() || 'item'}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: any = {
      post_type: postTypeSlug,
      title,
      status,
    };

    if (postTypeData?.supports?.content) data.content = content;
    if (postTypeData?.supports?.excerpt) data.excerpt = excerpt;
    if (postTypeData?.supports?.featured_image) data.featured_image_id = featuredImageId;
    if (postTypeData?.hierarchical) {
      data.parent_id = parentId;
      data.menu_order = menuOrder;
    }

    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading || !postTypeData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isEdit && !data?.post) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{postTypeData.singular_label} Not Found</h2>
        <p className="text-gray-600">The {postTypeData.singular_label.toLowerCase()} you're looking for doesn't exist.</p>
      </div>
    );
  }

  const mutation = isEdit ? updateMutation : createMutation;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEdit ? 'Edit' : 'Add New'} {postTypeData.singular_label}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            {postTypeData?.supports?.title !== false && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter title"
                  required
                />
              </div>
            )}

            {postTypeData?.supports?.content === true && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <RichTextEditor value={content} onChange={setContent} />
              </div>
            )}
          </div>

          {postTypeData?.supports?.excerpt === true && (
            <div className="bg-white rounded-lg shadow p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Excerpt
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Optional excerpt"
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          {postTypeData?.supports?.featured_image === true && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Featured Image</h3>
              
              {featuredImageUrl ? (
                <div className="space-y-3">
                  <img
                    src={featuredImageUrl}
                    alt="Featured"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowMediaModal(true)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFeaturedImageId(null);
                        setFeaturedImageUrl('');
                      }}
                      className="px-3 py-2 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMediaModal(true)}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors"
                >
                  Select Image
                </button>
              )}
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Publish</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {mutation.isPending 
                ? (isEdit ? 'Updating...' : 'Creating...') 
                : (isEdit ? `Update ${postTypeData.singular_label}` : `Publish ${postTypeData.singular_label}`)
              }
            </button>
          </div>

          {!!postTypeData?.hierarchical && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Page Attributes</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent
                </label>
                <select
                  value={parentId || ''}
                  onChange={(e) => setParentId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">No Parent (Top Level)</option>
                  {allPostsData?.posts
                    ?.filter((post: any) => !isEdit || post.id !== parseInt(postId || '0'))
                    .map((post: any) => (
                      <option key={post.id} value={post.id}>
                        {post.title}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order
                </label>
                <input
                  type="number"
                  value={menuOrder}
                  onChange={(e) => setMenuOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="0"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Lower numbers appear first
                </p>
              </div>
            </div>
          )}

          {postTypeData?.supports?.categories === true && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
              <CategorySelector
                selectedCategories={selectedCategories}
                onToggle={(categoryId) => {
                  setSelectedCategories((prev) =>
                    prev.includes(categoryId)
                      ? prev.filter((id) => id !== categoryId)
                      : [...prev, categoryId]
                  );
                }}
              />
            </div>
          )}
        </div>
      </form>

      {postTypeData?.supports?.featured_image === true && (
        <MediaSelector
          isOpen={showMediaModal}
          onClose={() => setShowMediaModal(false)}
          onSelect={(id, url) => {
            setFeaturedImageId(id);
            setFeaturedImageUrl(url);
          }}
          currentMediaId={featuredImageId || undefined}
        />
      )}
    </div>
  );
}

