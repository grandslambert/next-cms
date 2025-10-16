'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';

export default function MenuLocationsPage() {
  const { isLoading: permissionLoading } = usePermission('manage_settings');
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationDesc, setNewLocationDesc] = useState('');

  const queryClient = useQueryClient();

  // Fetch menu locations
  const { data: locationsData, isLoading } = useQuery({
    queryKey: ['menu-locations'],
    queryFn: async () => {
      const res = await axios.get('/api/menu-locations');
      return res.data;
    },
  });

  // Create location mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const res = await axios.post('/api/menu-locations', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-locations'] });
      toast.success('Menu location created successfully');
      setNewLocationName('');
      setNewLocationDesc('');
    },
    onError: () => {
      toast.error('Failed to create menu location');
    },
  });

  // Delete location mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await axios.delete(`/api/menu-locations/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-locations'] });
      toast.success('Menu location deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete menu location');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName) return;
    
    createMutation.mutate({
      name: newLocationName,
      description: newLocationDesc,
    });
  };

  if (permissionLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Menu Locations</h1>
        <p className="text-gray-600 mt-1">Manage where menus can be displayed on your site</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Locations List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Available Locations</h2>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {locationsData?.locations?.map((location: any) => (
                  <div key={location.id} className="flex justify-between items-start p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{location.name}</p>
                        {location.is_builtin === 1 && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-medium">
                            Built-in
                          </span>
                        )}
                      </div>
                      {location.description && (
                        <p className="text-sm text-gray-600 mt-1">{location.description}</p>
                      )}
                    </div>
                    {location.is_builtin !== 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete location "${location.name}"?`)) {
                            deleteMutation.mutate(location.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
                {!locationsData?.locations?.length && (
                  <p className="text-gray-500 text-center py-8">No locations defined</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Add Location Form */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Add New Location</h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="location-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Location Name *
                </label>
                <input
                  id="location-name"
                  type="text"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value.toLowerCase().replaceAll(/[^a-z0-9_]/g, '_'))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="my_custom_location"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Lowercase, underscores only (used in theme code)</p>
              </div>

              <div>
                <label htmlFor="location-desc" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="location-desc"
                  value={newLocationDesc}
                  onChange={(e) => setNewLocationDesc(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Where this menu will appear on your site"
                />
              </div>

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? 'Adding...' : 'Add Location'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

