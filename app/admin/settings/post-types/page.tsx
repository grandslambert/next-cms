'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

interface PostType {
  id: number;
  name: string;
  label: string;
  singular_label: string;
  description: string;
  icon: string;
  supports: {
    title?: boolean;
    content?: boolean;
    excerpt?: boolean;
    featured_image?: boolean;
  };
  menu_position: number;
}

export default function PostTypesSettings() {
  const [editingPostType, setEditingPostType] = useState<PostType | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    label: '',
    singular_label: '',
    description: '',
    icon: '📄',
    url_structure: 'default' as 'default' | 'date_based',
    menu_position: 5,
    show_in_dashboard: true,
    hierarchical: false,
    supports: {
      title: true,
      content: true,
      excerpt: true,
      featured_image: true,
    },
  });
  const [selectedTaxonomies, setSelectedTaxonomies] = useState<number[]>([]);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['post-types'],
    queryFn: async () => {
      const res = await axios.get('/api/post-types');
      return res.data;
    },
  });

  const { data: taxonomiesData } = useQuery({
    queryKey: ['taxonomies'],
    queryFn: async () => {
      const res = await axios.get('/api/taxonomies');
      return res.data;
    },
  });

  // Fetch assigned taxonomies when editing
  const { data: assignedTaxonomies } = useQuery({
    queryKey: ['post-type-taxonomies', editingPostType?.id],
    queryFn: async () => {
      if (!editingPostType?.id) return { taxonomies: [] };
      const res = await axios.get(`/api/post-types/${editingPostType.id}/taxonomies`);
      return res.data;
    },
    enabled: !!editingPostType?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await axios.post('/api/post-types', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-types'] });
      toast.success('Post type created successfully');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create post type');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, taxonomies, ...data }: any) => {
      const res = await axios.put(`/api/post-types/${id}`, data);
      // Also update taxonomies
      if (taxonomies !== undefined) {
        await axios.put(`/api/post-types/${id}/taxonomies`, { taxonomy_ids: taxonomies });
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-types'] });
      queryClient.invalidateQueries({ queryKey: ['post-type-taxonomies'] });
      toast.success('Post type updated successfully');
      setEditingPostType(null);
      setSelectedTaxonomies([]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update post type');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await axios.delete(`/api/post-types/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-types'] });
      toast.success('Post type deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete post type');
    },
  });

  const resetForm = () => {
    setIsCreating(false);
    setFormData({
      name: '',
      slug: '',
      label: '',
      singular_label: '',
      description: '',
      icon: '📄',
      url_structure: 'default' as 'default' | 'date_based',
      menu_position: 5,
      show_in_dashboard: true,
      hierarchical: false,
      supports: {
        title: true,
        content: true,
        excerpt: true,
        featured_image: true,
      },
    });
    setSelectedTaxonomies([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPostType) {
      updateMutation.mutate({ id: editingPostType.id, ...formData, taxonomies: selectedTaxonomies });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (postType: any) => {
    setEditingPostType(postType);
    setFormData({
      name: postType.name,
      slug: postType.slug || '',
      label: postType.label,
      singular_label: postType.singular_label,
      description: postType.description || '',
      icon: postType.icon || '📄',
      url_structure: postType.url_structure || 'default',
      menu_position: postType.menu_position || 5,
      show_in_dashboard: postType.show_in_dashboard !== false,
      hierarchical: postType.hierarchical || false,
      supports: postType.supports || {},
    });
    setIsCreating(false);
    // Taxonomies will be loaded by the query
  };

  const isBuiltIn = (name: string) => name === 'post' || name === 'page';

  // Update selectedTaxonomies when assignedTaxonomies changes
  React.useEffect(() => {
    if (assignedTaxonomies?.taxonomies) {
      setSelectedTaxonomies(assignedTaxonomies.taxonomies.map((t: any) => t.id));
    }
  }, [assignedTaxonomies]);

  const handleDelete = (postType: PostType) => {
    if (postType.name === 'post' || postType.name === 'page') {
      toast.error(`Cannot delete the built-in "${postType.label}" post type`);
      return;
    }

    if (confirm(`Are you sure you want to delete the "${postType.label}" post type?\n\nThis cannot be undone.`)) {
      deleteMutation.mutate(postType.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Post Types</h2>
        <p className="text-gray-600">
          Create and manage custom post types for different content types (portfolios, products, events, etc.)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Post Types List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Existing Post Types</h3>
            <button
              onClick={() => {
                resetForm();
                setIsCreating(true);
                setEditingPostType(null);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              + Add New
            </button>
          </div>

          {data?.postTypes && data.postTypes.length > 0 ? (
            <div className="space-y-3">
              {data.postTypes.map((postType: PostType) => (
                <div 
                  key={postType.id} 
                  className={`bg-white rounded-lg shadow p-4 border-2 ${
                    editingPostType?.id === postType.id ? 'border-primary-500' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{postType.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{postType.label}</h4>
                          {(postType.name === 'post' || postType.name === 'page') && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                              Built-in
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">Name: {postType.name}</p>
                        {postType.description && (
                          <p className="text-sm text-gray-600 mt-1">{postType.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(postType.supports).map(([key, value]) => 
                            value ? (
                              <span key={key} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {key.replace('_', ' ')}
                              </span>
                            ) : null
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(postType)}
                        className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      {postType.name !== 'post' && postType.name !== 'page' && (
                        <button
                          onClick={() => handleDelete(postType)}
                          className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No post types yet</p>
          )}
        </div>

        {/* Form */}
        {(isCreating || editingPostType) && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingPostType ? 'Edit Post Type' : 'Create New Post Type'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="portfolio"
                  required
                  disabled={!!editingPostType}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Internal identifier. Lowercase, alphanumeric with underscores. Cannot be changed after creation.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL Slug {isBuiltIn(formData.name) && <span className="text-xs text-gray-500">(Built-in, cannot change)</span>}
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^\w-]/g, '-').replace(/-+/g, '-') })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono disabled:bg-gray-100"
                  placeholder="portfolio (leave empty for root)"
                  disabled={editingPostType && isBuiltIn(editingPostType.name)}
                />
                <p className="mt-1 text-xs text-gray-500">
                  URL prefix for this post type. Example: "portfolio" → <code>/portfolio/item-slug</code>. Leave empty for root level like pages.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL Structure
                </label>
                <select
                  value={formData.url_structure}
                  onChange={(e) => setFormData({ ...formData, url_structure: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="default">Default (/{formData.slug || 'slug'}/post-title)</option>
                  <option value="year">Year (/{formData.slug || 'slug'}/2025/post-title)</option>
                  <option value="year_month">Year/Month (/{formData.slug || 'slug'}/2025/10/post-title)</option>
                  <option value="year_month_day">Year/Month/Day (/{formData.slug || 'slug'}/2025/10/15/post-title)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  How URLs are structured. Date options use the post's published date.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plural Label *
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Portfolio Items"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Singular Label *
                </label>
                <input
                  type="text"
                  value={formData.singular_label}
                  onChange={(e) => setFormData({ ...formData, singular_label: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Portfolio Item"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={2}
                  placeholder="Portfolio projects and work samples"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon (emoji)
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="🎨"
                  maxLength={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Menu Position
                </label>
                <input
                  type="number"
                  value={formData.menu_position}
                  onChange={(e) => setFormData({ ...formData, menu_position: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="1"
                  max="100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Lower numbers appear higher in the menu
                </p>
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_in_dashboard}
                    onChange={(e) => setFormData({ ...formData, show_in_dashboard: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Show in Dashboard Content Summary
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500 ml-6">
                  Display this post type in the dashboard overview card
                </p>
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hierarchical}
                    onChange={(e) => setFormData({ ...formData, hierarchical: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Hierarchical (Allow Parent/Child Relationships)
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500 ml-6">
                  Enable parent selection for nested organization (like Pages)
                </p>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Supports
                </label>
                <div className="space-y-2">
                  {['title', 'content', 'excerpt', 'featured_image'].map((feature) => (
                    <label key={feature} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!!(formData.supports as any)[feature]}
                        onChange={(e) => setFormData({
                          ...formData,
                          supports: {
                            ...formData.supports,
                            [feature]: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {feature.replace('_', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {editingPostType && taxonomiesData?.taxonomies && taxonomiesData.taxonomies.length > 0 && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Taxonomies
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                    {taxonomiesData.taxonomies.map((taxonomy: any) => (
                      <label key={taxonomy.id} className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTaxonomies.includes(taxonomy.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTaxonomies([...selectedTaxonomies, taxonomy.id]);
                            } else {
                              setSelectedTaxonomies(selectedTaxonomies.filter(id => id !== taxonomy.id));
                            }
                          }}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {taxonomy.label} <span className="text-gray-500 text-xs">({taxonomy.hierarchical ? 'Hierarchical' : 'Flat'})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Select which taxonomies can be assigned to this post type
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {editingPostType ? 'Update' : 'Create'} Post Type
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPostType(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

