'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import { usePermission } from '@/hooks/usePermission';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
  const { isLoading: permissionLoading } = usePermission('manage_users');
  const { data: session, update } = useSession();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [roleId, setRoleId] = useState(3); // Default to Author role
  const queryClient = useQueryClient();

  // Get user switching data
  const isSuperAdmin = (session?.user as any)?.isSuperAdmin || false;
  const currentUserRole = (session?.user as any)?.role;
  const isSwitched = (session?.user as any)?.isSwitched || false;
  const originalUserId = (session?.user as any)?.originalUserId;
  const currentUserId = (session?.user as any)?.id;
  const canSwitchUsers = isSuperAdmin || currentUserRole === 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await axios.get('/api/users');
      return res.data;
    },
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await axios.get('/api/roles');
      return res.data;
    },
  });

  // Fetch password requirements
  const { data: authSettings } = useQuery({
    queryKey: ['auth-settings'],
    queryFn: async () => {
      const res = await axios.get('/api/settings/authentication');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await axios.post('/api/users', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create user');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await axios.put(`/api/users/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete user');
    },
  });

  const switchUserMutation = useMutation({
    mutationFn: async (targetUserId: number) => {
      const res = await axios.post('/api/auth/switch-user', { targetUserId });
      return res.data.switchData;
    },
    onSuccess: async (switchData) => {
      await update({ switchData });
      toast.success(`Switched to ${switchData.name}`);
      queryClient.invalidateQueries();
      router.refresh();
      router.push('/admin/sites'); // Redirect to sites after switching
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to switch user');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = { username, first_name: firstName, last_name: lastName, email, password, role_id: roleId };
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (user: any) => {
    setEditingId(user.id);
    setUsername(user.username);
    setFirstName(user.first_name);
    setLastName(user.last_name || '');
    setEmail(user.email);
    setPassword(''); // Don't pre-fill password for security
    setRoleId(user.role_id || 3);
    setShowForm(true);
  };

  const handleDelete = (id: number, username: string) => {
    if (confirm(`Are you sure you want to delete user "${username}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSwitchUser = (userId: number, username: string) => {
    if (confirm(`Switch to user "${username}"? You can switch back from the sidebar.`)) {
      switchUserMutation.mutate(userId);
    }
  };

  const resetForm = () => {
    setUsername('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setRoleId(3); // Default to Author
    setEditingId(null);
    setShowForm(false);
  };

  // Check which password requirements are met
  const checkPasswordRequirements = () => {
    const settings = authSettings?.settings || {
      password_min_length: 8,
      password_require_uppercase: true,
      password_require_lowercase: true,
      password_require_numbers: true,
      password_require_special: false,
    };

    return {
      length: password.length >= settings.password_min_length,
      uppercase: !settings.password_require_uppercase || /[A-Z]/.test(password),
      lowercase: !settings.password_require_lowercase || /[a-z]/.test(password),
      numbers: !settings.password_require_numbers || /[0-9]/.test(password),
      special: !settings.password_require_special || /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };
  };

  const generatePassword = () => {
    const settings = authSettings?.settings || {
      password_min_length: 8,
      password_require_uppercase: true,
      password_require_lowercase: true,
      password_require_numbers: true,
      password_require_special: false,
    };

    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}';

    let chars = '';
    let generated = '';

    // Add required character types first
    if (settings.password_require_lowercase) {
      chars += lowercase;
      generated += lowercase[Math.floor(Math.random() * lowercase.length)];
    }
    if (settings.password_require_uppercase) {
      chars += uppercase;
      generated += uppercase[Math.floor(Math.random() * uppercase.length)];
    }
    if (settings.password_require_numbers) {
      chars += numbers;
      generated += numbers[Math.floor(Math.random() * numbers.length)];
    }
    if (settings.password_require_special) {
      chars += special;
      generated += special[Math.floor(Math.random() * special.length)];
    }

    // If no requirements, use all character types
    if (!chars) {
      chars = lowercase + uppercase + numbers;
    }

    // Fill remaining length
    const remainingLength = Math.max(settings.password_min_length - generated.length, 0);
    for (let i = 0; i < remainingLength; i++) {
      generated += chars[Math.floor(Math.random() * chars.length)];
    }

    // Shuffle the password
    const shuffled = generated.split('').sort(() => Math.random() - 0.5).join('');
    setPassword(shuffled);
    setShowPassword(true);
    toast.success('Password generated!');
  };

  if (permissionLoading) {
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
          <h1 className="text-2xl font-bold">All Users</h1>
          <p className="text-sm text-gray-600">Manage user accounts and assign roles</p>
        </div>
        <div className="flex space-x-2">
          {showForm ? (
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
                {editingId ? 'Update User' : 'Create User'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              + New User
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto h-[calc(100vh-8rem)]">
        <div className="px-8 py-6">

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit User' : 'New User'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    // Convert spaces to underscores, remove other special characters
                    const sanitized = e.target.value
                      .replace(/ /g, '_')
                      .replace(/[^a-zA-Z0-9_]/g, '');
                    setUsername(sanitized);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  placeholder="john_doe"
                  autoComplete="off"
                  pattern="[a-zA-Z0-9_]+"
                  title="Username can only contain letters, numbers, and underscores"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Only letters, numbers, and underscores allowed
                </p>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password {editingId && '(leave blank to keep current)'}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-24 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required={!editingId}
                    autoComplete="new-password"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="px-2 py-1 text-gray-500 hover:text-gray-700 text-sm"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="px-2 py-1 text-gray-500 hover:text-gray-700 text-sm"
                      title="Generate random password"
                    >
                      🎲
                    </button>
                  </div>
                </div>
                {authSettings?.settings && (password || !editingId) && (
                  <div className="mt-2 text-xs">
                    <div className="font-medium mb-1 text-gray-700">Requirements:</div>
                    <ul className="space-y-1">
                      <li className="flex items-center space-x-2">
                        <span>{checkPasswordRequirements().length ? '✅' : '❌'}</span>
                        <span className={checkPasswordRequirements().length ? 'text-green-700' : 'text-red-700'}>
                          At least {authSettings.settings.password_min_length} characters
                        </span>
                      </li>
                      {authSettings.settings.password_require_uppercase && (
                        <li className="flex items-center space-x-2">
                          <span>{checkPasswordRequirements().uppercase ? '✅' : '❌'}</span>
                          <span className={checkPasswordRequirements().uppercase ? 'text-green-700' : 'text-red-700'}>
                            One uppercase letter
                          </span>
                        </li>
                      )}
                      {authSettings.settings.password_require_lowercase && (
                        <li className="flex items-center space-x-2">
                          <span>{checkPasswordRequirements().lowercase ? '✅' : '❌'}</span>
                          <span className={checkPasswordRequirements().lowercase ? 'text-green-700' : 'text-red-700'}>
                            One lowercase letter
                          </span>
                        </li>
                      )}
                      {authSettings.settings.password_require_numbers && (
                        <li className="flex items-center space-x-2">
                          <span>{checkPasswordRequirements().numbers ? '✅' : '❌'}</span>
                          <span className={checkPasswordRequirements().numbers ? 'text-green-700' : 'text-red-700'}>
                            One number
                          </span>
                        </li>
                      )}
                      {authSettings.settings.password_require_special && (
                        <li className="flex items-center space-x-2">
                          <span>{checkPasswordRequirements().special ? '✅' : '❌'}</span>
                          <span className={checkPasswordRequirements().special ? 'text-green-700' : 'text-red-700'}>
                            One special character
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  id="role"
                  value={roleId}
                  onChange={(e) => setRoleId(Number.parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {rolesData?.roles?.map((role: any) => (
                    <option key={role.id} value={role.id}>
                      {role.display_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        </div>
      )}

      {!showForm && (
      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : data?.users && data.users.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                {isSuperAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Site Assignments
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.users.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Edit
                      </button>
                      {canSwitchUsers && 
                       user.id.toString() !== currentUserId && 
                       (!isSwitched || user.id.toString() !== originalUserId) &&
                       !(currentUserRole === 'admin' && user.role_name === 'super_admin') && (
                        <button
                          onClick={() => handleSwitchUser(user.id, user.username)}
                          disabled={switchUserMutation.isPending}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          title="Switch to this user for testing"
                        >
                          🔄 Switch
                        </button>
                      )}
                      {user.id !== (session?.user as any)?.id && (
                        <button
                          onClick={() => handleDelete(user.id, user.username)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.first_name} {user.last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      user.role_name === 'super_admin'
                        ? 'bg-red-100 text-red-800'
                        : user.role_name === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : user.role_name === 'editor'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.role_display_name || user.role_name || 'Unknown'}
                    </span>
                  </td>
                  {isSuperAdmin && (
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {user.sites && user.sites.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.sites.map((site: any) => (
                            <span
                              key={site.id}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                              title={`${site.display_name} (${site.role_display_name})`}
                            >
                              {site.display_name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Not assigned</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg">No users found</p>
          </div>
        )}
      </div>
      )}
        </div>
      </div>
    </div>
  );
}

