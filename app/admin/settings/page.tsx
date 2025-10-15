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
      setSiteName(data.settings.site_name || '');
      setSiteTagline(data.settings.site_tagline || '');
      setSiteDescription(data.settings.site_description || '');
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
    updateMutation.mutate({
      site_name: siteName,
      site_tagline: siteTagline,
      site_description: siteDescription,
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
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">General Settings</h1>
        <p className="text-gray-600 mt-2">Configure your site's general settings</p>
      </div>

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

        <div className="pt-4">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

