'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';

interface AuthSettings {
  hide_default_user: boolean;
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_numbers: boolean;
  password_require_special: boolean;
}

export default function AuthenticationSettingsPage() {
  usePermission('manage_settings');

  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<AuthSettings>({
    hide_default_user: false,
    password_min_length: 8,
    password_require_uppercase: true,
    password_require_lowercase: true,
    password_require_numbers: true,
    password_require_special: false,
  });

  // Fetch current settings
  const { isLoading, data: authData } = useQuery({
    queryKey: ['auth-settings'],
    queryFn: async () => {
      const res = await axios.get('/api/settings/authentication');
      return res.data;
    },
  });

  // Update local state when data changes
  React.useEffect(() => {
    if (authData?.settings) {
      setSettings(authData.settings);
    }
  }, [authData]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (newSettings: AuthSettings) => {
      setIsSaving(true);
      const response = await axios.put('/api/settings/authentication', newSettings);
      return response.data;
    },
    onSuccess: async () => {
      toast.success('Authentication settings saved successfully!');
      await queryClient.invalidateQueries({ queryKey: ['auth-settings'] });
      await queryClient.refetchQueries({ queryKey: ['auth-settings'] });
      setIsSaving(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save settings');
      setIsSaving(false);
    },
  });

  const handleSave = () => {
    // Validate min length
    if (settings.password_min_length < 6) {
      toast.error('Minimum password length must be at least 6 characters');
      return;
    }
    if (settings.password_min_length > 128) {
      toast.error('Maximum password length cannot exceed 128 characters');
      return;
    }

    saveMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="-m-8 h-[calc(100vh-4rem)]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Authentication Settings</h1>
          <p className="text-sm text-gray-600">Configure login behavior and password requirements</p>
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
            Login Page
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
                <div className="font-medium">Hide Default User Hint</div>
                <div className="text-sm text-gray-600">
                  Don't display the default admin email (admin@example.com) on the login page. 
                  Recommended for production sites to enhance security.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Password Requirements */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">🔒</span>
            Password Requirements
          </h2>

          <p className="text-sm text-gray-600 mb-6">
            Set minimum password requirements for user accounts. These apply when creating users or resetting passwords.
          </p>

          <div className="space-y-6">
            {/* Minimum Length */}
            <div>
              <label className="block font-medium mb-2">
                Minimum Password Length
              </label>
              <input
                type="number"
                min="6"
                max="128"
                value={settings.password_min_length}
                onChange={(e) => setSettings({ ...settings, password_min_length: parseInt(e.target.value) || 8 })}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Recommended: 8-12 characters (min: 6, max: 128)
              </p>
            </div>

            {/* Character Requirements */}
            <div className="space-y-3">
              <div className="font-medium mb-3">Required Characters</div>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.password_require_uppercase}
                  onChange={(e) => setSettings({ ...settings, password_require_uppercase: e.target.checked })}
                  className="mt-0.5 w-5 h-5 text-primary-600 focus:ring-primary-500 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">Uppercase Letters (A-Z)</div>
                  <div className="text-xs text-gray-600">
                    Require at least one uppercase letter
                  </div>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.password_require_lowercase}
                  onChange={(e) => setSettings({ ...settings, password_require_lowercase: e.target.checked })}
                  className="mt-0.5 w-5 h-5 text-primary-600 focus:ring-primary-500 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">Lowercase Letters (a-z)</div>
                  <div className="text-xs text-gray-600">
                    Require at least one lowercase letter
                  </div>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.password_require_numbers}
                  onChange={(e) => setSettings({ ...settings, password_require_numbers: e.target.checked })}
                  className="mt-0.5 w-5 h-5 text-primary-600 focus:ring-primary-500 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">Numbers (0-9)</div>
                  <div className="text-xs text-gray-600">
                    Require at least one number
                  </div>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.password_require_special}
                  onChange={(e) => setSettings({ ...settings, password_require_special: e.target.checked })}
                  className="mt-0.5 w-5 h-5 text-primary-600 focus:ring-primary-500 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">Special Characters (!@#$%^&*)</div>
                  <div className="text-xs text-gray-600">
                    Require at least one special character
                  </div>
                </div>
              </label>
            </div>

            {/* Password Example */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Password Requirements Summary:
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Minimum {settings.password_min_length} characters</li>
                {settings.password_require_uppercase && <li>• At least one uppercase letter</li>}
                {settings.password_require_lowercase && <li>• At least one lowercase letter</li>}
                {settings.password_require_numbers && <li>• At least one number</li>}
                {settings.password_require_special && <li>• At least one special character</li>}
              </ul>
              <p className="text-xs text-gray-500 mt-3">
                Example valid password: <code className="bg-white px-2 py-1 rounded border">
                  {settings.password_require_special ? 'MyP@ssw0rd' : 'MyPassw0rd'}
                </code>
              </p>
            </div>
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}

