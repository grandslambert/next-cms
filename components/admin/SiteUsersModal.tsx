'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

interface SiteUsersModalProps {
  site: any;
  onClose: () => void;
}

export default function SiteUsersModal({ site, onClose }: SiteUsersModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const queryClient = useQueryClient();

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Fetch users assigned to this site
  const { data: siteUsersData, isLoading: loadingSiteUsers } = useQuery({
    queryKey: ['site-users', site.id],
    queryFn: async () => {
      const res = await axios.get(`/api/sites/${site.id}/users`);
      return res.data;
    },
  });

  // Fetch all users (for adding new ones)
  const { data: allUsersData } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const res = await axios.get('/api/users');
      return res.data;
    },
    enabled: isAdding,
  });

  // Fetch all roles
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await axios.get('/api/roles');
      return res.data;
    },
  });

  const addUserMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const res = await axios.post(`/api/sites/${site.id}/users`, {
        user_id: userId,
        role_id: roleId,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-users', site.id] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('User added to site successfully');
      setIsAdding(false);
      setSelectedUserId('');
      setSelectedRoleId('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add user to site');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const res = await axios.put(`/api/sites/${site.id}/users/${userId}`, {
        role_id: roleId,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-users', site.id] });
      toast.success('User role updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update user role');
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await axios.delete(`/api/sites/${site.id}/users/${userId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-users', site.id] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('User removed from site successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to remove user from site');
    },
  });

  const handleAddUser = () => {
    if (!selectedUserId || !selectedRoleId) {
      toast.error('Please select a user and role');
      return;
    }
    addUserMutation.mutate({ userId: selectedUserId, roleId: selectedRoleId });
  };

  const handleRoleChange = (userId: string, newRoleId: string) => {
    updateRoleMutation.mutate({ userId, roleId: newRoleId });
  };

  const handleRemoveUser = (userId: string, username: string) => {
    if (confirm(`Are you sure you want to remove ${username} from this site?`)) {
      removeUserMutation.mutate(userId);
    }
  };

  const siteUsers = siteUsersData?.users || [];
  const allUsers = allUsersData?.users || [];
  const roles = rolesData?.roles || [];

  // Filter out users already assigned to this site
  const availableUsers = allUsers.filter(
    (user: any) => !siteUsers.some((su: any) => su.user_id === user.id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Manage Site Users</h2>
            <p className="text-sm text-gray-600 mt-1">{site.display_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* Add User Section */}
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full mb-6 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors flex items-center justify-center space-x-2"
            >
              <span className="text-xl">+</span>
              <span>Add User to Site</span>
            </button>
          ) : (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Add New User</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a user...</option>
                    {availableUsers.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.username} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a role...</option>
                    {roles.filter((r: any) => r.name !== 'super_admin').map((role: any) => (
                      <option key={role.id} value={role.id}>
                        {role.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={handleAddUser}
                  disabled={addUserMutation.isPending}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {addUserMutation.isPending ? 'Adding...' : 'Add User'}
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setSelectedUserId('');
                    setSelectedRoleId('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Users List */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Assigned Users ({siteUsers.length})
            </h3>
            {loadingSiteUsers ? (
              <div className="text-center py-8 text-gray-500">Loading users...</div>
            ) : siteUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No users assigned to this site yet.
              </div>
            ) : (
              <div className="space-y-2">
                {siteUsers.map((siteUser: any) => (
                  <div
                    key={siteUser.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {siteUser.first_name} {siteUser.last_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {siteUser.username} • {siteUser.email}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <select
                        value={siteUser.role_id}
                        onChange={(e) => handleRoleChange(siteUser.user_id, e.target.value)}
                        disabled={updateRoleMutation.isPending}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                      >
                        {roles.filter((r: any) => r.name !== 'super_admin').map((role: any) => (
                          <option key={role.id} value={role.id}>
                            {role.display_name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRemoveUser(siteUser.user_id, siteUser.username)}
                        disabled={removeUserMutation.isPending}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Remove user from site"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

