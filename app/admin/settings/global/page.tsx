'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface GlobalSettings {
  hide_default_user: boolean;
}

export default function GlobalSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<GlobalSettings>({
    hide_default_user: false,
  });

  const isSuperAdmin = (session?.user as any)?.isSuperAdmin || false;

  // Fetch current settings - must call hook before any early returns
  const { isLoading, data: globalData } = useQuery({
    queryKey: ['global-settings'],
    queryFn: async () => {
      const res = await axios.get('/api/settings/global');
      return res.data;
    },
    enabled: isSuperAdmin,
  });

  // Update local state when data changes
  React.useEffect(() => {
    if (globalData?.settings) {
      setSettings(globalData.settings);
    }
  }, [globalData]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (newSettings: GlobalSettings) => {
      setIsSaving(true);
      const response = await axios.put('/api/settings/global', newSettings);
      return response.data;
    },
    onSuccess: async () => {
      toast.success('Global settings saved successfully!');
      await queryClient.invalidateQueries({ queryKey: ['global-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['auth-settings'] }); // Refresh login page data
      setIsSaving(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save settings');
      setIsSaving(false);
    },
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  // Redirect non-super-admins after hooks are called
  if (status === 'authenticated' && !isSuperAdmin) {
    router.push('/admin');
    return null;
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
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
          <h1 className="text-2xl font-bold">Global Settings</h1>
          <p className="text-sm text-gray-600">System-wide settings (Super Admin only)</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto h-[calc(100vh-8rem)]">
        <div className="max-w-3xl px-8 py-6">
          <div className="space-y-8">
            {/* Login Page Settings */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">🔑</span>
                Login Page Settings
              </h2>

              <div className="space-y-4">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.hide_default_user}
                    onChange={(e) => setSettings({ ...settings, hide_default_user: e.target.checked })}
                    className="mt-1 w-5 h-5 text-primary-600 focus:ring-primary-500 rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Hide Default Credentials</div>
                    <div className="text-sm text-gray-600">
                      Don't display the default super admin and site admin credentials on the login page. 
                      Recommended for production sites to enhance security.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">About Global Settings</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  <strong>System-Wide:</strong> Global settings apply to the entire CMS installation, across all sites.
                </li>
                <li>
                  <strong>Super Admin Only:</strong> Only super administrators can access and modify these settings.
                </li>
                <li>
                  <strong>Security:</strong> These settings control system-level security and behavior.
                </li>
                <li>
                  <strong>Login Page:</strong> Settings like "Hide Default Credentials" affect the login page visible to everyone.
                </li>
              </ul>
            </div>

            {/* Future Settings Placeholder */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <p className="text-gray-500 text-sm">
                More global settings will be added here in future updates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

