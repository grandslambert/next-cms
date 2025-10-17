'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { usePermission } from '@/hooks/usePermission';
import ActivityLogDetailsModal from '@/components/admin/ActivityLogDetailsModal';

export default function ActivityLogPage() {
  const { isLoading: permissionLoading, isSuperAdmin } = usePermission('manage_users');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [filterUserId, setFilterUserId] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [filterSiteId, setFilterSiteId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch activity logs
  const { data: logsData, isLoading } = useQuery({
    queryKey: ['activity-log', currentPage, itemsPerPage, filterUserId, filterAction, filterEntityType, filterSiteId, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(filterUserId && { user_id: filterUserId }),
        ...(filterAction && { action: filterAction }),
        ...(filterEntityType && { entity_type: filterEntityType }),
        ...(isSuperAdmin && filterSiteId && { site_id: filterSiteId }),
        ...(debouncedSearch && { search: debouncedSearch }),
      });
      const res = await axios.get(`/api/activity-log?${params}`);
      return res.data;
    },
  });

  // Fetch users for filter dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await axios.get('/api/users');
      return res.data;
    },
  });

  // Fetch sites for filter dropdown (super admin only)
  const { data: sitesData } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const res = await axios.get('/api/sites');
      return res.data;
    },
    enabled: isSuperAdmin,
  });

  const formatAction = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('created')) return 'bg-green-100 text-green-800';
    if (action.includes('updated')) return 'bg-blue-100 text-blue-800';
    if (action.includes('deleted') || action.includes('trashed')) return 'bg-red-100 text-red-800';
    if (action.includes('restored')) return 'bg-yellow-100 text-yellow-800';
    if (action.includes('published')) return 'bg-purple-100 text-purple-800';
    if (action.includes('login')) return 'bg-indigo-100 text-indigo-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (permissionLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="-m-8 h-[calc(100vh-4rem)]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4">
        <h1 className="text-2xl font-bold">Activity Log</h1>
        <p className="text-sm text-gray-600">
          {isSuperAdmin 
            ? 'View all user activities and system events across all sites'
            : 'View all user activities and system events for your site'
          }
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto h-[calc(100vh-8rem)]">
        <div className="px-8 py-6">

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className={`grid grid-cols-1 gap-4 ${isSuperAdmin ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
          {/* Site Filter (Super Admin Only) */}
          {isSuperAdmin && (
            <div>
              <label htmlFor="filter-site" className="block text-sm font-medium text-gray-700 mb-1">
                Site
              </label>
              <select
                id="filter-site"
                value={filterSiteId}
                onChange={(e) => {
                  setFilterSiteId(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Sites</option>
                <option value="global">Global Only</option>
                {sitesData?.sites?.map((site: any) => (
                  <option key={site.id} value={site.id}>
                    {site.display_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User Filter */}
          <div>
            <label htmlFor="filter-user" className="block text-sm font-medium text-gray-700 mb-1">
              User
            </label>
            <select
              id="filter-user"
              value={filterUserId}
              onChange={(e) => {
                setFilterUserId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Users</option>
              {usersData?.users?.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.username} ({user.first_name} {user.last_name})
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label htmlFor="filter-action" className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              id="filter-action"
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="post_created">Post Created</option>
              <option value="post_updated">Post Updated</option>
              <option value="post_deleted">Post Deleted</option>
              <option value="post_published">Post Published</option>
              <option value="media_uploaded">Media Uploaded</option>
              <option value="user_created">User Created</option>
              <option value="role_updated">Role Updated</option>
              <option value="settings_updated">Settings Updated</option>
            </select>
          </div>

          {/* Entity Type Filter */}
          <div>
            <label htmlFor="filter-entity" className="block text-sm font-medium text-gray-700 mb-1">
              Entity Type
            </label>
            <select
              id="filter-entity"
              value={filterEntityType}
              onChange={(e) => {
                setFilterEntityType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Types</option>
              <option value="auth">Authentication</option>
              <option value="post">Posts</option>
              <option value="media">Media</option>
              <option value="user">Users</option>
              <option value="role">Roles</option>
              <option value="taxonomy">Taxonomies</option>
              <option value="settings">Settings</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search entity name or details..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Activity Log Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading activity log...</p>
            </div>
          ) : logsData?.logs?.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No activity found
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    {isSuperAdmin && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Site
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logsData?.logs?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {log.username}
                        </div>
                        <div className="text-xs text-gray-500">
                          {log.first_name} {log.last_name}
                        </div>
                      </td>
                      {isSuperAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.site_name || <span className="text-gray-400 italic">Global</span>}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
                          {formatAction(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">{log.entity_type}</div>
                        {log.entity_name && (
                          <div className="text-xs text-gray-500">{log.entity_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                        {log.details}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ip_address || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetailsModal(true);
                          }}
                          className="text-primary-600 hover:text-primary-900 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {logsData?.pagination && logsData.pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">
                      Page {logsData.pagination.page} of {logsData.pagination.totalPages}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({logsData.pagination.total} total entries)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === logsData.pagination.totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setCurrentPage(logsData.pagination.totalPages)}
                      disabled={currentPage === logsData.pagination.totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Details Modal */}
      <ActivityLogDetailsModal
        isOpen={showDetailsModal}
        log={selectedLog}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedLog(null);
        }}
      />
        </div>
      </div>
    </div>
  );
}

