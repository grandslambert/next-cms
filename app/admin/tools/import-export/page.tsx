'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';

interface ExportOptions {
  posts: boolean;
  media: boolean;
  taxonomies: boolean;
  menus: boolean;
  settings: boolean;
  users: boolean;
  postTypes: boolean;
}

export default function ImportExportPage() {
  usePermission('manage_settings');

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    posts: true,
    media: true,
    taxonomies: true,
    menus: true,
    settings: true,
    users: false, // Default to false for security
    postTypes: true,
  });

  const [importFile, setImportFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async (options: ExportOptions) => {
      setIsExporting(true);
      const response = await axios.post('/api/tools/export', options, {
        responseType: 'blob',
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Create download link
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.setAttribute('download', `nextcms-export-${timestamp}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Data exported successfully!');
      setIsExporting(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to export data');
      setIsExporting(false);
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post('/api/tools/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Import completed! ${data.summary}`);
      setImportFile(null);
      // Reset file input
      const fileInput = document.getElementById('import-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to import data');
    },
  });

  const handleExport = () => {
    // Check if at least one option is selected
    if (!Object.values(exportOptions).some(v => v)) {
      toast.error('Please select at least one data type to export');
      return;
    }
    exportMutation.mutate(exportOptions);
  };

  const handleImport = () => {
    if (!importFile) {
      toast.error('Please select a file to import');
      return;
    }
    
    if (!importFile.name.endsWith('.json')) {
      toast.error('Please select a valid JSON file');
      return;
    }

    if (confirm('Are you sure you want to import this data? This will add new content and may update existing content.')) {
      importMutation.mutate(importFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const toggleOption = (key: keyof ExportOptions) => {
    setExportOptions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const selectAll = () => {
    setExportOptions({
      posts: true,
      media: true,
      taxonomies: true,
      menus: true,
      settings: true,
      users: true,
      postTypes: true,
    });
  };

  const selectNone = () => {
    setExportOptions({
      posts: false,
      media: false,
      taxonomies: false,
      menus: false,
      settings: false,
      users: false,
      postTypes: false,
    });
  };

  return (
    <div className="-m-8 h-[calc(100vh-4rem)]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4">
        <h1 className="text-2xl font-bold">Import/Export Data</h1>
        <p className="text-sm text-gray-600">
          Export your site data to JSON files for backup or migration, or import data from a previous export
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto h-[calc(100vh-8rem)]">
        <div className="px-8 py-6">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Export Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Export Data</h2>
            <span className="text-3xl">📤</span>
          </div>

          <p className="text-gray-600 mb-6">
            Select the data types you want to export. The export will be downloaded as a JSON file.
          </p>

          <div className="space-y-3 mb-6">
            <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.posts}
                onChange={() => toggleOption('posts')}
                className="w-5 h-5 text-primary-600 focus:ring-primary-500 rounded"
              />
              <div className="flex-1">
                <div className="font-medium">Posts & Pages</div>
                <div className="text-sm text-gray-500">All content including custom post types</div>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.media}
                onChange={() => toggleOption('media')}
                className="w-5 h-5 text-primary-600 focus:ring-primary-500 rounded"
              />
              <div className="flex-1">
                <div className="font-medium">Media Library</div>
                <div className="text-sm text-gray-500">Images, files, and metadata (files themselves not included)</div>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.taxonomies}
                onChange={() => toggleOption('taxonomies')}
                className="w-5 h-5 text-primary-600 focus:ring-primary-500 rounded"
              />
              <div className="flex-1">
                <div className="font-medium">Taxonomies</div>
                <div className="text-sm text-gray-500">Categories, tags, and custom taxonomies</div>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.menus}
                onChange={() => toggleOption('menus')}
                className="w-5 h-5 text-primary-600 focus:ring-primary-500 rounded"
              />
              <div className="flex-1">
                <div className="font-medium">Navigation Menus</div>
                <div className="text-sm text-gray-500">Menu structures and locations</div>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.postTypes}
                onChange={() => toggleOption('postTypes')}
                className="w-5 h-5 text-primary-600 focus:ring-primary-500 rounded"
              />
              <div className="flex-1">
                <div className="font-medium">Post Types</div>
                <div className="text-sm text-gray-500">Custom post type definitions</div>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.settings}
                onChange={() => toggleOption('settings')}
                className="w-5 h-5 text-primary-600 focus:ring-primary-500 rounded"
              />
              <div className="flex-1">
                <div className="font-medium">Settings</div>
                <div className="text-sm text-gray-500">Site configuration and preferences</div>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 cursor-pointer border border-yellow-200">
              <input
                type="checkbox"
                checked={exportOptions.users}
                onChange={() => toggleOption('users')}
                className="w-5 h-5 text-primary-600 focus:ring-primary-500 rounded"
              />
              <div className="flex-1">
                <div className="font-medium flex items-center">
                  Users & Roles
                  <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">Sensitive</span>
                </div>
                <div className="text-sm text-gray-600">User accounts and permissions (passwords excluded)</div>
              </div>
            </label>
          </div>

          <div className="flex space-x-2 mb-4">
            <button
              onClick={selectAll}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Select All
            </button>
            <button
              onClick={selectNone}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Select None
            </button>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting || exportMutation.isPending}
            className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isExporting || exportMutation.isPending ? '⏳ Exporting...' : '📤 Export Selected Data'}
          </button>
        </div>

        {/* Import Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Import Data</h2>
            <span className="text-3xl">📥</span>
          </div>

          <p className="text-gray-600 mb-6">
            Upload a JSON file previously exported from Next CMS to import data.
          </p>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-6 text-center">
            <input
              type="file"
              id="import-file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="import-file"
              className="cursor-pointer"
            >
              <div className="text-5xl mb-4">📁</div>
              <div className="text-lg font-medium mb-2">
                {importFile ? importFile.name : 'Choose a file'}
              </div>
              <div className="text-sm text-gray-500">
                Click to browse or drag and drop
              </div>
              <div className="text-xs text-gray-400 mt-2">
                JSON files only
              </div>
            </label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <span className="text-2xl mr-3">ℹ️</span>
              <div>
                <h3 className="font-medium text-blue-900 mb-1">Import Notes</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Existing content will not be duplicated</li>
                  <li>• New content will be added</li>
                  <li>• User passwords are never imported</li>
                  <li>• Media files must be manually transferred</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={!importFile || importMutation.isPending}
            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {importMutation.isPending ? '⏳ Importing...' : '📥 Import Data'}
          </button>
        </div>
      </div>

      {/* Warning Section */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex">
          <span className="text-3xl mr-4">⚠️</span>
          <div>
            <h3 className="font-bold text-yellow-900 mb-2">Important Reminders</h3>
            <ul className="text-sm text-yellow-800 space-y-2">
              <li>
                <strong>Backup First:</strong> Always create a backup before importing data to prevent accidental data loss.
              </li>
              <li>
                <strong>Media Files:</strong> Export/import only includes media metadata. Actual files must be manually copied from the <code className="bg-yellow-100 px-1">uploads/</code> directory.
              </li>
              <li>
                <strong>Database IDs:</strong> Imported content may have different IDs than the original, which could affect external references.
              </li>
              <li>
                <strong>Users:</strong> For security, user passwords are never exported or imported. Users will need to reset their passwords.
              </li>
            </ul>
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}

