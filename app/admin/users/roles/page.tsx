'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';

const CORE_PERMISSIONS = [
  { key: 'view_dashboard', label: 'View Dashboard', description: 'Access admin dashboard', category: 'General' },
  { key: 'view_others_posts', label: 'View Others\' Posts', description: 'See posts created by other users in lists', category: 'General' },
  { key: 'manage_others_posts', label: 'Manage Others\' Posts', description: 'Edit posts by other users (requires View Others\' Posts)', category: 'General' },
  { key: 'can_publish', label: 'Publish Posts', description: 'Publish and unpublish posts (without this, can only submit for review)', category: 'General' },
  { key: 'can_delete', label: 'Delete Own Posts', description: 'Delete own posts', category: 'General' },
  { key: 'can_delete_others', label: 'Delete Others\' Posts', description: 'Delete posts by other users', category: 'General' },
  { key: 'can_reassign', label: 'Reassign Author', description: 'Change the author of posts', category: 'General' },
  { key: 'manage_media', label: 'Manage Media', description: 'Upload and manage media files', category: 'General' },
  { key: 'manage_taxonomies', label: 'Manage Taxonomies', description: 'Manage categories, tags, and terms', category: 'General' },
  { key: 'manage_users', label: 'Manage Users', description: 'Create, edit, and delete users', category: 'Administration' },
  { key: 'manage_roles', label: 'Manage Roles', description: 'Create and edit user roles', category: 'Administration' },
  { key: 'manage_post_types', label: 'Manage Post Types', description: 'Create and configure post types', category: 'Administration' },
  { key: 'manage_settings', label: 'Manage Settings', description: 'Access and modify system settings', category: 'Administration' },
];

export default function RolesPage() {
  const { isLoading: permissionLoading, isSuperAdmin } = usePermission('manage_roles');
  const [editingRole, setEditingRole] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    permissions: {} as Record<string, boolean>,
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await axios.get('/api/roles');
      return res.data;
    },
  });

  const { data: postTypesData } = useQuery({
    queryKey: ['post-types'],
    queryFn: async () => {
      const res = await axios.get('/api/post-types');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await axios.post('/api/roles', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role created successfully');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create role');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await axios.put(`/api/roles/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role updated successfully');
      setEditingRole(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update role');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`/api/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete role');
    },
  });

  const resetForm = () => {
    setIsCreating(false);
    setFormData({
      name: '',
      display_name: '',
      description: '',
      permissions: {},
    });
  };

  const handleEdit = (role: any) => {
    // Prevent editing super admin role
    if (role.name === 'super_admin') {
      toast.error('Super Administrator role cannot be edited');
      return;
    }

    setEditingRole(role);
    setFormData({
      name: role.name,
      display_name: role.display_name,
      description: role.description || '',
      permissions: role.permissions || {},
    });
    setIsCreating(false);
  };

  const handleClone = (role: any) => {
    // Prevent cloning super admin role
    if (role.name === 'super_admin') {
      toast.error('Super Administrator role cannot be cloned');
      return;
    }
    setEditingRole(null);
    setIsCreating(true);
    setFormData({
      name: `${role.name}_copy`,
      display_name: `${role.display_name} (Copy)`,
      description: role.description || '',
      permissions: { ...(role.permissions || {}) },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (role: any) => {
    if (role.is_system) {
      toast.error('Cannot delete system role');
      return;
    }

    // Prevent super admins from deleting site-specific roles
    if (isSuperAdmin && role.site_id) {
      toast.error('Site-specific roles can only be deleted by site administrators');
      return;
    }

    if (confirm(`Are you sure you want to delete the "${role.display_name}" role?`)) {
      deleteMutation.mutate(role.id);
    }
  };

  const togglePermission = (key: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  if (permissionLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="-m-8 h-[calc(100vh-4rem)]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
          <p className="text-sm text-gray-600">Define custom roles and control what users can do</p>
        </div>
        <div className="flex space-x-2">
          {(isCreating || editingRole) ? (
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
                {editingRole ? 'Update Role' : 'Create Role'}
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                resetForm();
                setIsCreating(true);
                setEditingRole(null);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              + Add New
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto h-[calc(100vh-8rem)]">
        <div className="px-8 py-6">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Roles List */}
        <div className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Existing Roles</h3>
          </div>

          {data?.roles && data.roles.length > 0 ? (
            <div className="space-y-3">
              {data.roles
                .filter((role: any) => isSuperAdmin || role.id !== 0) // Hide super admin role from non-super admins
                .map((role: any) => (
                <div
                  key={role.id}
                  className={`bg-white rounded-lg shadow p-4 border-2 ${
                    editingRole?.id === role.id ? 'border-primary-500' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{role.display_name}</h4>
                        {!!role.is_system && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                            System
                          </span>
                        )}
                        {role.site_id != null && role.site_id !== '' ? (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium">
                            {role.site_name || `Site ${role.site_id}`}
                          </span>
                        ) : (
                          !role.is_system && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded font-medium">
                              Global
                            </span>
                          )
                        )}
                        {role.has_override && !isSuperAdmin && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded font-medium">
                            Customized
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">Name: {role.name}</p>
                      {role.description && (
                        <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.entries(role.permissions || {})
                          .filter(([, value]) => value)
                          .map(([key]) => {
                            // Check if it's a core permission
                            const corePermission = CORE_PERMISSIONS.find(p => p.key === key);
                            if (corePermission) {
                              return (
                                <span
                                  key={key}
                                  className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded"
                                >
                                  {corePermission.label}
                                </span>
                              );
                            }
                            
                            // Check if it's a post type permission
                            if (key.startsWith('manage_posts_')) {
                              const postTypeName = key.replace('manage_posts_', '');
                              const postType = postTypesData?.postTypes?.find((pt: any) => pt.name === postTypeName);
                              return (
                                <span
                                  key={key}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                                >
                                  {postType?.icon} {postType?.label || postTypeName}
                                </span>
                              );
                            }
                            
                            return (
                              <span
                                key={key}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                              >
                                {key}
                              </span>
                            );
                          })}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      {role.name !== 'super_admin' ? (
                        <>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(role)}
                              className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleClone(role)}
                              className="px-3 py-1 text-sm border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
                              title="Clone this role"
                            >
                              Clone
                            </button>
                          </div>
                          {!role.is_system && !(isSuperAdmin && role.site_id) && (
                            <button
                              onClick={() => handleDelete(role)}
                              className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50 w-full"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="px-3 py-1 text-xs text-gray-500 text-center border border-gray-200 rounded bg-gray-50">
                          Protected Role
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No roles yet</p>
          )}
        </div>

        {/* Create/Edit Form */}
        {(isCreating || editingRole) && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingRole ? 'Edit Role' : 'Create New Role'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="role-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="role-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                    })
                  }
                  disabled={editingRole?.is_system}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                  placeholder="editor"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  {editingRole?.is_system
                    ? 'System role names cannot be changed'
                    : 'Lowercase, alphanumeric with underscores'}
                </p>
              </div>

              <div>
                <label htmlFor="role-display-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="role-display-name"
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  disabled={editingRole?.is_system}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                  placeholder="Content Editor"
                  required
                />
              </div>

              <div>
                <label htmlFor="role-description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="role-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              <div className="border-t pt-4">
                <p className="block text-sm font-medium text-gray-700 mb-3">
                  Permissions <span className="text-red-500">*</span>
                </p>
                <div className="space-y-4 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                  {/* Core Permissions */}
                  {['General', 'Administration'].map((category) => (
                    <div key={category}>
                      <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">{category}</h4>
                      <div className="space-y-2">
                        {CORE_PERMISSIONS.filter(p => p.category === category).map((permission) => (
                          <label key={permission.key} className="flex items-start cursor-pointer" aria-label={permission.label}>
                            <input
                              type="checkbox"
                              checked={!!formData.permissions[permission.key]}
                              onChange={() => togglePermission(permission.key)}
                              className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              aria-label={permission.label}
                            />
                            <div className="ml-2">
                              <span className="text-sm font-medium text-gray-700">{permission.label}</span>
                              <p className="text-xs text-gray-500">{permission.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Post Type Permissions */}
                  {postTypesData?.postTypes && postTypesData.postTypes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Post Types</h4>
                      <div className="space-y-2">
                        {postTypesData.postTypes.map((postType: any) => (
                          <label key={postType.name} className="flex items-start cursor-pointer" aria-label={`Manage ${postType.label}`}>
                            <input
                              type="checkbox"
                              checked={!!formData.permissions[`manage_posts_${postType.name}`]}
                              onChange={() => togglePermission(`manage_posts_${postType.name}`)}
                              className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              aria-label={`Manage ${postType.label}`}
                            />
                            <div className="ml-2">
                              <span className="text-sm font-medium text-gray-700">
                                {postType.icon} {postType.label}
                              </span>
                              <p className="text-xs text-gray-500">
                                Create and edit own {postType.label.toLowerCase()}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">About Roles & Permissions</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            <strong>Super Administrator:</strong> Has unrestricted access to all features and bypasses all permission checks. Cannot be edited or cloned.
          </li>
          <li>
            <strong>System Roles:</strong> Admin, Editor, and Author are built-in and cannot be deleted. You can modify their permissions.
          </li>
          <li>
            <strong>Custom Roles:</strong> Create your own roles with specific permission sets for your team.
          </li>
          <li>
            <strong>Permissions:</strong> Control what users can view and manage in the CMS.
          </li>
          <li>
            <strong>Safety:</strong> Roles with assigned users cannot be deleted until users are reassigned.
          </li>
        </ul>
      </div>
        </div>
      </div>
    </div>
  );
}

