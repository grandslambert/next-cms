'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SiteUsersModal from '@/components/admin/SiteUsersModal';

export default function SitesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [editingSite, setEditingSite] = useState<any>(null);
  const [managingUsersSite, setManagingUsersSite] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    domain: '',
    description: '',
    is_active: true,
  });

  const queryClient = useQueryClient();
  const isSuperAdmin = (session?.user as any)?.isSuperAdmin;

  // Call all hooks before any early returns
  const { data, isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const res = await axios.get('/api/sites');
      return res.data;
    },
    enabled: isSuperAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await axios.post('/api/sites', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Site created successfully');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create site');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await axios.put(`/api/sites/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Site updated successfully');
      setEditingSite(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update site');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.delete(`/api/sites/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Site deleted successfully');
      if (data.warning) {
        setTimeout(() => toast(data.warning, { duration: 8000, icon: '⚠️' }), 1000);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete site');
    },
  });

  const resetForm = () => {
    setIsCreating(false);
    setEditingSite(null);
    setFormData({
      name: '',
      display_name: '',
      domain: '',
      description: '',
      is_active: true,
    });
  };

  const handleEdit = (site: any) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      display_name: site.display_name,
      domain: site.domain || '',
      description: site.description || '',
      is_active: site.is_active,
    });
    setIsCreating(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSite) {
      updateMutation.mutate({ id: editingSite.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (site: any) => {
    if (site.id === 1) {
      toast.error('Cannot delete the default site');
      return;
    }

    if (confirm(`Are you sure you want to delete "${site.display_name}"?\n\nNote: Site data in MongoDB collections will be automatically deleted.`)) {
      deleteMutation.mutate(site.id);
    }
  };

  // Redirect non-super-admins after hooks are called
  if (status === 'authenticated' && !isSuperAdmin) {
    router.push('/admin');
    return null;
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="-m-8 h-[calc(100vh-4rem)]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sites</h1>
          <p className="text-sm text-gray-600">Manage multiple sites from one CMS installation</p>
        </div>
        <div className="flex space-x-2">
          {(isCreating || editingSite) ? (
            <>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {editingSite ? 'Update Site' : 'Create Site'}
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                resetForm();
                setIsCreating(true);
                setEditingSite(null);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              + Add New Site
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto h-[calc(100vh-8rem)]">
        <div className="px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sites List */}
            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Existing Sites</h3>
              </div>

              {data?.sites && data.sites.length > 0 ? (
                <div className="space-y-3">
                  {data.sites.map((site: any) => (
                    <div
                      key={site.id}
                      className={`bg-white rounded-lg shadow p-4 border-2 ${
                        editingSite?.id === site.id ? 'border-primary-500' : 'border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">{site.display_name}</h4>
                            {site.id === 1 && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                                Default
                              </span>
                            )}
                            {!site.is_active && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded font-medium">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">Name: {site.name}</p>
                          {site.domain && (
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">Domain:</span> {site.domain}
                            </p>
                          )}
                          {site.description && (
                            <p className="text-sm text-gray-600 mt-1">{site.description}</p>
                          )}
                          {site.user_count !== undefined && (
                            <p className="text-xs text-gray-500 mt-2">
                              {site.user_count} user{site.user_count !== 1 ? 's' : ''} assigned
                            </p>
                          )}
                          <div className="mt-2 text-xs text-gray-500">
                            ID: <code className="bg-gray-100 px-1 py-0.5 rounded">{site.id}</code>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2 ml-4">
                          <button
                            onClick={() => setManagingUsersSite(site)}
                            className="px-3 py-1 text-sm border border-primary-300 text-primary-700 rounded hover:bg-primary-50"
                          >
                            👥 Users
                          </button>
                          <button
                            onClick={() => handleEdit(site)}
                            className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          {site.id !== 1 && (
                            <button
                              onClick={() => handleDelete(site)}
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
                <p className="text-gray-500 text-center py-8">No sites yet</p>
              )}
            </div>

            {/* Create/Edit Form */}
            {(isCreating || editingSite) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingSite ? 'Edit Site' : 'Create New Site'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="site-display-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Display Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="site-display-name"
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => {
                        const displayName = e.target.value;
                        // Auto-generate name from display name if not editing
                        const autoName = displayName
                          .toLowerCase()
                          .replaceAll(/[^a-z0-9]+/g, '_')
                          .replaceAll(/(?:^_+|_+$)/g, ''); // Remove leading/trailing underscores
                        
                        setFormData({
                          ...formData,
                          display_name: displayName,
                          // Only auto-generate name when creating new site
                          name: editingSite ? formData.name : autoName,
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="My Site"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="site-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="site-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          name: e.target.value.toLowerCase().replaceAll(/[^a-z0-9_]/g, '_'),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="my_site"
                      required
                      disabled={!!editingSite}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {editingSite 
                        ? '⚠️ Name cannot be changed after site creation (used for table prefix)'
                        : 'Auto-generated from display name. Used for table prefix: site_&#123;id&#125;_'
                      }
                    </p>
                  </div>

                  <div>
                    <label htmlFor="site-domain" className="block text-sm font-medium text-gray-700 mb-2">
                      Domain
                    </label>
                    <input
                      id="site-domain"
                      type="text"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="example.com"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Optional. Domain for this site (for future multi-domain support)
                    </p>
                  </div>

                  <div>
                    <label htmlFor="site-description" className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      id="site-description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                      placeholder="Optional description"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      id="site-active"
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="site-active" className="ml-2 text-sm font-medium text-gray-700">
                      Site is active
                    </label>
                  </div>
                </form>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">About Multi-Site Management</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                <strong>Super Admin Only:</strong> Only super administrators can create, edit, or delete sites.
              </li>
              <li>
                <strong>Table Prefixes:</strong> Each site gets its own set of tables with prefix <code className="bg-blue-100 px-1 rounded">site_&#123;id&#125;_</code>
              </li>
              <li>
                <strong>Global Resources:</strong> Users and roles are shared across all sites.
              </li>
              <li>
                <strong>Site-Specific Content:</strong> Posts, media, menus, and settings are unique to each site.
              </li>
              <li>
                <strong>Safety:</strong> Deleting a site does NOT automatically drop its database tables for safety. Drop them manually if needed.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Site Users Modal */}
      {managingUsersSite && (
        <SiteUsersModal
          site={managingUsersSite}
          onClose={() => setManagingUsersSite(null)}
        />
      )}
    </div>
  );
}

