'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function TaxonomiesSettingsPage() {
  const [editingTaxonomy, setEditingTaxonomy] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    singular_label: '',
    description: '',
    hierarchical: false,
    show_in_menu: true,
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
      menu_position: taxonomy.menu_position || 20,
    });
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTaxonomy(null);
    resetForm();
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingTaxonomy(null);
    resetForm();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-gray-600">
            Taxonomies organize and categorize your content. Create custom taxonomies like "Locations" or "Products".
          </p>
        </div>
        {!isCreating && !editingTaxonomy && (
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            + Add Taxonomy
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingTaxonomy) && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {editingTaxonomy ? 'Edit Taxonomy' : 'Create New Taxonomy'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Label (Plural) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Locations"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Singular Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.singular_label}
                  onChange={(e) => setFormData({ ...formData, singular_label: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Location"
                  required
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
                />
                <p className="mt-1 text-xs text-gray-500">
                  Lower numbers appear first in the menu
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
                placeholder="Optional description"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.hierarchical}
                  onChange={(e) => setFormData({ ...formData, hierarchical: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Hierarchical (allow parent/child relationships like categories)
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.show_in_menu}
                  onChange={(e) => setFormData({ ...formData, show_in_menu: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Show in admin menu
                </span>
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingTaxonomy
                  ? 'Update Taxonomy'
                  : 'Create Taxonomy'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Taxonomies List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Label
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Menu Position
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.taxonomies && data.taxonomies.length > 0 ? (
              data.taxonomies.map((taxonomy: any) => (
                <tr key={taxonomy.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    <button
                      onClick={() => handleEdit(taxonomy)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      Edit
                    </button>
                    {!isBuiltIn(taxonomy.name) && (
                      <button
                        onClick={() => handleDelete(taxonomy.id, taxonomy.label)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {taxonomy.name}
                      </span>
                      {isBuiltIn(taxonomy.name) && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Built-in
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{taxonomy.label}</div>
                    <div className="text-sm text-gray-500">{taxonomy.singular_label}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      {taxonomy.hierarchical ? 'Hierarchical' : 'Flat'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {taxonomy.menu_position}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No taxonomies yet. Create your first one!
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

