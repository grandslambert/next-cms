'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import RichTextEditor from '@/components/admin/RichTextEditor';
import CategorySelector from '@/components/admin/CategorySelector';
import MediaSelector from '@/components/admin/MediaSelector';

export default function EditPostPage({ params }: { params: { id: string } }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImageId, setFeaturedImageId] = useState<number | null>(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [status, setStatus] = useState('draft');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['post', params.id],
    queryFn: async () => {
      const res = await axios.get(`/api/posts/${params.id}`);
      return res.data;
    },
  });

  const { data: postCategoriesData } = useQuery({
    queryKey: ['postCategories', params.id],
    queryFn: async () => {
      const res = await axios.get(`/api/posts/${params.id}/categories`);
      return res.data;
    },
  });

  useEffect(() => {
    if (data?.post) {
      setTitle(data.post.title);
      setContent(data.post.content || '');
      setExcerpt(data.post.excerpt || '');
      setFeaturedImageId(data.post.featured_image_id || null);
      setFeaturedImageUrl(data.post.featured_image_url || '');
      setStatus(data.post.status);
    }
  }, [data]);

  useEffect(() => {
    if (postCategoriesData?.categories) {
      setSelectedCategories(postCategoriesData.categories.map((c: any) => c.id));
    }
  }, [postCategoriesData]);

  const updateMutation = useMutation({
    mutationFn: async (updateData: any) => {
      const res = await axios.put(`/api/posts/${params.id}`, updateData);
      return res.data;
    },
    onSuccess: async () => {
      // Update categories
      await axios.put(`/api/posts/${params.id}/categories`, {
        categoryIds: selectedCategories
      });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', params.id] });
      queryClient.invalidateQueries({ queryKey: ['postCategories', params.id] });
      toast.success('Post updated successfully');
      router.push('/admin/posts');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update post');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ title, content, excerpt, featured_image_id: featuredImageId, status });
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!data?.post) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Post Not Found</h2>
          <p className="text-gray-600 mb-4">The post you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/admin/posts')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Back to Posts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Post</h1>
        <p className="text-gray-600 mt-2">Update your blog post</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-6">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <RichTextEditor value={content} onChange={setContent} />
              </div>

              <div>
                <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-2">
                  Excerpt
                </label>
                <textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Brief description of your post..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Publish</h3>
              
              <div className="mb-4">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="trash">Trash</option>
                </select>
              </div>

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Updating...' : 'Update Post'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>

            <CategorySelector 
              selectedCategories={selectedCategories}
              onToggle={toggleCategory}
            />

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Featured Image</h3>
              
              {featuredImageUrl ? (
                <div className="mb-4">
                  <div className="relative rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={featuredImageUrl}
                      alt="Featured"
                      className="w-full aspect-video object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFeaturedImageId(null);
                        setFeaturedImageUrl('');
                      }}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-700"
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  <div className="text-4xl mb-2">🖼️</div>
                  <p className="text-sm text-gray-600">No image selected</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowMediaModal(true)}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                {featuredImageUrl ? 'Change Image' : 'Select Image'}
              </button>
            </div>
          </div>
        </div>
      </form>

      <MediaSelector
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onSelect={(id, url) => {
          setFeaturedImageId(id);
          setFeaturedImageUrl(url);
        }}
        currentMediaId={featuredImageId || undefined}
      />
    </div>
  );
}

