'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';

export default function TaxonomiesSettingsPage() {
  const { isLoading: permissionLoading } = usePermission('manage_post_types');
  const [editingTaxonomy, setEditingTaxonomy] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    singular_label: '',
    description: '',
    hierarchical: false,
    show_in_menu: true,
    show_in_dashboard: false,
    menu_position: 20,
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['taxonomies'],
    queryFn: async () => {
      const res = await axios.get('/api/taxonomies');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await axios.post('/api/taxonomies', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxonomies'] });
      toast.success('Taxonomy created successfully');
      setIsCreating(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create taxonomy');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await axios.put(`/api/taxonomies/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxonomies'] });
      toast.success('Taxonomy updated successfully');
      setEditingTaxonomy(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update taxonomy');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`/api/taxonomies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxonomies'] });
      toast.success('Taxonomy deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete taxonomy');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      label: '',
      singular_label: '',
      description: '',
      hierarchical: false,
      show_in_menu: true,
      show_in_dashboard: false,
      menu_position: 20,
    });
  };

  const handleEdit = (taxonomy: any) => {
    setEditingTaxonomy(taxonomy);
    setFormData({
      name: taxonomy.name,
      label: taxonomy.label,
      singular_label: taxonomy.singular_label,
      description: taxonomy.description || '',
      hierarchical: !!taxonomy.hierarchical,
      show_in_menu: !!taxonomy.show_in_menu,
      show_in_dashboard: !!taxonomy.show_in_dashboard,
      menu_position: taxonomy.menu_position || 20,
    });
    setIsCreating(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingTaxonomy) {
      // Update existing (don't allow name change)
      const { name, ...updateData } = formData;
      updateMutation.mutate({ id: editingTaxonomy.id, data: updateData });
    } else {
      // Create new
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete the "${name}" taxonomy?`)) {
      deleteMutation.mutate(id);
    }
  };

  const isBuiltIn = (name: string) => {
    return name === 'category' || name === 'tag';
  };

  if (permissionLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Taxonomies</h1>
        <p className="text-gray-600 mt-2">
          Taxonomies organize and categorize your content. Create custom taxonomies like "Locations" or "Products".
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Taxonomies List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Existing Taxonomies</h3>
            <button
              onClick={() => {
                resetForm();
                setIsCreating(true);
                setEditingTaxonomy(null);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              + Add New
            </button>
          </div>

          {data?.taxonomies && data.taxonomies.length > 0 ? (
            <div className="space-y-3">
              {data.taxonomies.map((taxonomy: any) => (
                <div 
                  key={taxonomy.id} 
                  className={`bg-white rounded-lg shadow p-4 border-2 ${
                    editingTaxonomy?.id === taxonomy.id ? 'border-primary-500' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{taxonomy.label}</h4>
                        {isBuiltIn(taxonomy.name) && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                            Built-in
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                          {taxonomy.hierarchical ? 'Hierarchical' : 'Flat'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Name: {taxonomy.name}</p>
                      {taxonomy.description && (
                        <p className="text-sm text-gray-600 mt-1">{taxonomy.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(taxonomy)}
                        className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      {!isBuiltIn(taxonomy.name) && (
                        <button
                          onClick={() => handleDelete(taxonomy.id, taxonomy.label)}
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
            <p className="text-gray-500 text-center py-8">No taxonomies yet</p>
          )}
        </div>

        {/* Create/Edit Form */}
        {(isCreating || editingTaxonomy) && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingTaxonomy ? 'Edit Taxonomy' : 'Create New Taxonomy'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="taxonomy-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="taxonomy-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!!editingTaxonomy}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                  placeholder="location"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Lowercase, alphanumeric, underscores only. Cannot be changed after creation.
                </p>
              </div>

              <div>
                <label htmlFor="taxonomy-label" className="block text-sm font-medium text-gray-700 mb-2">
                  Label (Plural) <span className="text-red-500">*</span>
                </label>
                <input
                  id="taxonomy-label"
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Locations"
                  required
                />
              </div>

              <div>
                <label htmlFor="taxonomy-singular-label" className="block text-sm font-medium text-gray-700 mb-2">
                  Singular Label <span className="text-red-500">*</span>
                </label>
                <input
                  id="taxonomy-singular-label"
                  type="text"
                  value={formData.singular_label}
                  onChange={(e) => setFormData({ ...formData, singular_label: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Location"
                  required
                />
              </div>

              <div>
                <label htmlFor="taxonomy-description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="taxonomy-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label htmlFor="taxonomy-menu-position" className="block text-sm font-medium text-gray-700 mb-2">
                  Menu Position
                </label>
                <input
                  id="taxonomy-menu-position"
                  type="number"
                  value={formData.menu_position}
                  onChange={(e) => setFormData({ ...formData, menu_position: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Lower numbers appear first in the menu
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
                    Hierarchical (allow parent/child relationships)
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500 ml-6">
                  Like categories with parent/child structure
                </p>
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_in_menu}
                    onChange={(e) => setFormData({ ...formData, show_in_menu: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Show in admin menu
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500 ml-6">
                  Display this taxonomy in the sidebar
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
                  Display this taxonomy in the dashboard overview card
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {editingTaxonomy ? 'Update' : 'Create'} Taxonomy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTaxonomy(null);
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

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">About Taxonomies</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>Hierarchical:</strong> Like categories (parent/child structure). Example: Location → USA → California</li>
          <li><strong>Flat:</strong> Like tags (no hierarchy). Example: #technology #tutorial #beginner</li>
          <li><strong>Built-in:</strong> Categories and Tags are pre-configured and cannot be deleted</li>
          <li><strong>Custom:</strong> Create your own like "Products", "Locations", "Events", etc.</li>
        </ul>
      </div>
    </div>
  );
}

