'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';

export default function GeneralSettingsPage() {
  const { isLoading: permissionLoading } = usePermission('manage_settings');
  const [siteName, setSiteName] = useState('');
  const [siteTagline, setSiteTagline] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [postsPerPage, setPostsPerPage] = useState('10');
  const [maxRevisions, setMaxRevisions] = useState('10');
  const [sessionTimeoutValue, setSessionTimeoutValue] = useState('24');
  const [sessionTimeoutUnit, setSessionTimeoutUnit] = useState<'minutes' | 'hours' | 'days'>('hours');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await axios.get('/api/settings');
      return res.data;
    },
  });

  useEffect(() => {
    if (data?.settings) {
      setSiteName(data.settings.site_title || '');
      setSiteTagline(data.settings.site_tagline || '');
      setSiteDescription(data.settings.site_description || '');
      setPostsPerPage(data.settings.posts_per_page?.toString() || '10');
      setMaxRevisions(data.settings.max_revisions?.toString() || '10');
      
      // Convert stored minutes to appropriate unit for display
      const minutes = Number.parseInt(data.settings.session_timeout || '1440');
      
      if (minutes % 1440 === 0) {
        // Divisible by 1440 = show as days
        setSessionTimeoutValue((minutes / 1440).toString());
        setSessionTimeoutUnit('days');
      } else if (minutes % 60 === 0) {
        // Divisible by 60 = show as hours
        setSessionTimeoutValue((minutes / 60).toString());
        setSessionTimeoutUnit('hours');
      } else {
        // Show as minutes
        setSessionTimeoutValue(minutes.toString());
        setSessionTimeoutUnit('minutes');
      }
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (settings: any) => {
      const res = await axios.put('/api/settings', { settings });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved successfully');
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert session timeout to minutes
    let timeoutInMinutes = Number.parseInt(sessionTimeoutValue);
    if (sessionTimeoutUnit === 'hours') {
      timeoutInMinutes *= 60;
    } else if (sessionTimeoutUnit === 'days') {
      timeoutInMinutes *= 1440;
    }
    
    updateMutation.mutate({
      site_title: siteName,
      site_tagline: siteTagline,
      site_description: siteDescription,
      posts_per_page: Number.parseInt(postsPerPage),
      max_revisions: Number.parseInt(maxRevisions),
      session_timeout: timeoutInMinutes.toString(),
    });
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
          <h1 className="text-2xl font-bold">General Settings</h1>
          <p className="text-sm text-gray-600">Configure your site's general settings</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={updateMutation.isPending}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto h-[calc(100vh-8rem)]">
        <div className="max-w-2xl px-8 py-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label htmlFor="site-name" className="block text-sm font-medium text-gray-700 mb-2">
            Site Name
          </label>
          <input
            id="site-name"
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="My Awesome Site"
          />
          <p className="text-sm text-gray-500 mt-1">
            The name of your website, used in page titles and headers
          </p>
        </div>

        <div>
          <label htmlFor="site-tagline" className="block text-sm font-medium text-gray-700 mb-2">
            Site Tagline
          </label>
          <input
            id="site-tagline"
            type="text"
            value={siteTagline}
            onChange={(e) => setSiteTagline(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Just another Next CMS site"
          />
          <p className="text-sm text-gray-500 mt-1">
            A short description or slogan for your site
          </p>
        </div>

        <div>
          <label htmlFor="site-description" className="block text-sm font-medium text-gray-700 mb-2">
            Site Description
          </label>
          <textarea
            id="site-description"
            value={siteDescription}
            onChange={(e) => setSiteDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="A detailed description of your website"
          />
          <p className="text-sm text-gray-500 mt-1">
            A longer description for SEO and site information
          </p>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Content Management</h2>
          
          <div className="mb-6">
            <label htmlFor="posts-per-page" className="block text-sm font-medium text-gray-700 mb-2">
              Posts Per Page
            </label>
            <input
              id="posts-per-page"
              type="number"
              min="1"
              max="100"
              value={postsPerPage}
              onChange={(e) => setPostsPerPage(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Number of posts to display per page in archives and listings
            </p>
          </div>
          
          <div className="mb-6">
            <label htmlFor="max-revisions" className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Revisions Per Post
            </label>
            <input
              id="max-revisions"
              type="number"
              min="0"
              max="100"
              value={maxRevisions}
              onChange={(e) => setMaxRevisions(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Number of revisions to keep for each post. Set to 0 to disable revisions. Older revisions will be automatically deleted.
            </p>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Authentication</h2>
          
          <div>
            <label htmlFor="session-timeout" className="block text-sm font-medium text-gray-700 mb-2">
              Session Timeout
            </label>
            <div className="flex gap-2">
              <input
                id="session-timeout"
                type="number"
                min="1"
                value={sessionTimeoutValue}
                onChange={(e) => setSessionTimeoutValue(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <select
                value={sessionTimeoutUnit}
                onChange={(e) => setSessionTimeoutUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              How long users stay logged in before automatic logout. Default: 24 hours. After changing this setting, run <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">node scripts/sync-session-timeout.js</code> and restart the server.
            </p>
          </div>
        </div>
      </form>
        </div>
      </div>
    </div>
  );
}

