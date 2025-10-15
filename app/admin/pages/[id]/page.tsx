'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import RichTextEditor from '@/components/admin/RichTextEditor';
import MediaSelector from '@/components/admin/MediaSelector';

export default function EditPagePage({ params }: { params: { id: string } }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [featuredImageId, setFeaturedImageId] = useState<number | null>(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [status, setStatus] = useState('draft');
  const [showMediaModal, setShowMediaModal] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['page', params.id],
    queryFn: async () => {
      const res = await axios.get(`/api/pages/${params.id}`);
      return res.data;
    },
  });

  useEffect(() => {
    if (data?.page) {
      setTitle(data.page.title);
      setContent(data.page.content || '');
      setFeaturedImageId(data.page.featured_image_id || null);
      setFeaturedImageUrl(data.page.featured_image_url || '');
      setStatus(data.page.status);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (updateData: any) => {
      const res = await axios.put(`/api/pages/${params.id}`, updateData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      queryClient.invalidateQueries({ queryKey: ['page', params.id] });
      toast.success('Page updated successfully');
      router.push('/admin/pages');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update page');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ title, content, featured_image_id: featuredImageId, status });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Page</h1>
        <p className="text-gray-600 mt-2">Update your page</p>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <RichTextEditor value={content} onChange={setContent} />
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
                  {updateMutation.isPending ? 'Updating...' : 'Update Page'}
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

