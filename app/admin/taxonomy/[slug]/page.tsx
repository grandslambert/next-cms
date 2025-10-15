'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import MediaSelector from '@/components/admin/MediaSelector';

export default function TaxonomyTermsPage() {
  const params = useParams();
  const taxonomySlug = params?.slug as string;
  const queryClient = useQueryClient();

  const [editingTerm, setEditingTerm] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_id: null as number | null,
    parent_id: null as number | null,
  });
  const [imageUrl, setImageUrl] = useState('');

  // Fetch taxonomy info
  const { data: taxonomyData } = useQuery({
    queryKey: ['taxonomy', taxonomySlug],
    queryFn: async () => {
      const res = await axios.get('/api/taxonomies');
      const taxonomy = res.data.taxonomies.find((t: any) => t.name === taxonomySlug);
      return taxonomy;
    },
  });

  // Fetch terms
  const { data, isLoading } = useQuery({
    queryKey: ['terms', taxonomySlug],
    queryFn: async () => {
      const res = await axios.get(`/api/terms?taxonomy=${taxonomySlug}`);
      return res.data;
    },
    enabled: !!taxonomyData,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await axios.post('/api/terms', { ...data, taxonomy_id: taxonomyData?.id });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms', taxonomySlug] });
      toast.success(`${taxonomyData?.singular_label} created successfully`);
      handleCancel();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || `Failed to create ${taxonomyData?.singular_label?.toLowerCase()}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await axios.put(`/api/terms/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms', taxonomySlug] });
      toast.success(`${taxonomyData?.singular_label} updated successfully`);
      handleCancel();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || `Failed to update ${taxonomyData?.singular_label?.toLowerCase()}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`/api/terms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms', taxonomySlug] });
      toast.success(`${taxonomyData?.singular_label} deleted successfully`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || `Failed to delete ${taxonomyData?.singular_label?.toLowerCase()}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image_id: null,
      parent_id: null,
    });
    setImageUrl('');
  };

  const handleEdit = (term: any) => {
    setEditingTerm(term);
    setFormData({
      name: term.name,
      description: term.description || '',
      image_id: term.image_id || null,
      parent_id: term.parent_id || null,
    });
    setImageUrl(term.image_url || '');
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTerm(null);
    resetForm();
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingTerm(null);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingTerm) {
      updateMutation.mutate({ id: editingTerm.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  // Build hierarchical tree for display
  const buildHierarchy = (terms: any[], parentId: number | null = null, level: number = 0): any[] => {
    const children: any[] = [];
    
    terms
      .filter((term: any) => (term.parent_id || null) === parentId)
      .forEach(term => {
        children.push({ ...term, level });
        children.push(...buildHierarchy(terms, term.id, level + 1));
      });
    
    return children;
  };

  const displayTerms = !!taxonomyData?.hierarchical && data?.terms 
    ? buildHierarchy(data.terms)
    : data?.terms || [];

  const availableParents = data?.terms?.filter((t: any) => t.id !== editingTerm?.id) || [];

  if (!taxonomyData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{taxonomyData.label}</h1>
          <p className="text-gray-600 mt-2">{taxonomyData.description}</p>
        </div>
        {!isCreating && !editingTerm && (
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            + Add {taxonomyData.singular_label}
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingTerm) && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {editingTerm ? `Edit ${taxonomyData.singular_label}` : `Create New ${taxonomyData.singular_label}`}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder={`Enter ${taxonomyData.singular_label?.toLowerCase()} name`}
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
                rows={3}
                placeholder="Optional description"
              />
            </div>

            {taxonomyData.hierarchical && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent {taxonomyData.singular_label}
                </label>
                <select
                  value={formData.parent_id || ''}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">None (Top Level)</option>
                  {availableParents.map((term: any) => (
                    <option key={term.id} value={term.id}>
                      {term.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image
              </label>
              {imageUrl ? (
                <div className="relative inline-block">
                  <img
                    src={imageUrl}
                    alt="Selected"
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, image_id: null });
                      setImageUrl('');
                    }}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMediaModal(true)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Select Image
                </button>
              )}
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingTerm
                  ? `Update ${taxonomyData.singular_label}`
                  : `Create ${taxonomyData.singular_label}`}
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

      {/* Terms List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : data?.terms && data.terms.length > 0 ? (
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
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayTerms.map((term: any) => (
                <tr key={term.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    <button
                      onClick={() => handleEdit(term)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(term.id, term.name)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {!!taxonomyData.hierarchical && term.level > 0 && (
                        <span className="text-gray-400 mr-2">
                          {'—'.repeat(term.level)} 
                        </span>
                      )}
                      {term.image_url && (
                        <img
                          src={term.image_url}
                          alt={term.name}
                          className="w-8 h-8 object-cover rounded mr-2"
                        />
                      )}
                      <span className="text-sm font-medium text-gray-900">{term.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 max-w-md truncate">
                      {term.description || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{term.count || 0}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(term.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-4">No {taxonomyData.label.toLowerCase()} yet</p>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              + Create First {taxonomyData.singular_label}
            </button>
          </div>
        )}
      </div>

      <MediaSelector
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onSelect={(id, url) => {
          setFormData({ ...formData, image_id: id });
          setImageUrl(url);
        }}
        currentMediaId={formData.image_id || undefined}
      />
    </div>
  );
}

