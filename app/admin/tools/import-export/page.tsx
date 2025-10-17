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
  format: 'json' | 'xml' | 'csv' | 'sql' | 'zip';
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
    format: 'json',
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
      return response;
    },
    onSuccess: (response) => {
      // Create download link
      const url = globalThis.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header, or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `nextcms-export-${Date.now()}.json`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch?.[1]) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      globalThis.URL.revokeObjectURL(url);
      
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
    if (!Object.values(exportOptions).some(Boolean)) {
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
    
    const fileName = importFile.name.toLowerCase();
    if (!fileName.endsWith('.json') && !fileName.endsWith('.zip')) {
      toast.error('Please select a valid JSON or ZIP file');
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
    setExportOptions(prev => ({
      ...prev,
      posts: true,
      media: true,
      taxonomies: true,
      menus: true,
      settings: true,
      users: true,
      postTypes: true,
    }));
  };

  const selectNone = () => {
    setExportOptions(prev => ({
      ...prev,
      posts: false,
      media: false,
      taxonomies: false,
      menus: false,
      settings: false,
      users: false,
      postTypes: false,
    }));
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
            Select the data types and format you want to export.
          </p>

          {/* Format Selection */}
          <div className="mb-6">
            <div className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportOptions(prev => ({ ...prev, format: 'json' }))}
                className={`p-3 rounded-lg border-2 text-left transition ${
                  exportOptions.format === 'json'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">JSON</div>
                <div className="text-xs text-gray-500">Standard format, easy to import</div>
              </button>
              
              <button
                onClick={() => setExportOptions(prev => ({ ...prev, format: 'xml' }))}
                className={`p-3 rounded-lg border-2 text-left transition ${
                  exportOptions.format === 'xml'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">XML (WordPress)</div>
                <div className="text-xs text-gray-500">WordPress WXR compatible</div>
              </button>
              
              <button
                onClick={() => setExportOptions(prev => ({ ...prev, format: 'csv' }))}
                className={`p-3 rounded-lg border-2 text-left transition ${
                  exportOptions.format === 'csv'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">CSV</div>
                <div className="text-xs text-gray-500">Spreadsheet format (ZIP)</div>
              </button>
              
              <button
                onClick={() => setExportOptions(prev => ({ ...prev, format: 'sql' }))}
                className={`p-3 rounded-lg border-2 text-left transition ${
                  exportOptions.format === 'sql'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">SQL</div>
                <div className="text-xs text-gray-500">Database dump</div>
              </button>
              
              <button
                onClick={() => setExportOptions(prev => ({ ...prev, format: 'zip' }))}
                className={`p-3 rounded-lg border-2 text-left transition col-span-2 ${
                  exportOptions.format === 'zip'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Full ZIP Archive</div>
                <div className="text-xs text-gray-500">JSON + actual media files included</div>
              </button>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
              <input
                id="export-posts"
                type="checkbox"
                checked={exportOptions.posts}
                onChange={() => toggleOption('posts')}
                className="w-5 h-5 text-primary-600 focus:ring-primary-500 rounded cursor-pointer"
              />
              <label htmlFor="export-posts" className="flex-1 cursor-pointer">
                <div className="font-medium">Posts & Pages</div>
                <div className="text-sm text-gray-500">All content including custom post types</div>
              </label>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
              <input
                id="export-media"
                type="checkbox"
                checked={exportOptions.media}
                onChange={() => toggleOption('media')}
                className="w-5 h-5 text-primary-600 focus:ring-primary-500 rounded cursor-pointer"
              />
              <label htmlFor="export-media" className="flex-1 cursor-pointer">
                <div className="font-medium">Media Library</div>
                <div className="text-sm text-gray-500">Images, files, and metadata (files themselves not included)</div>
              </label>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
              <input
                id="export-taxonomies"
                type="checkbox"
                checked={exportOptions.taxonomies}
                onChange={() => toggleOption('taxonomies')}
                className="w-5 h-5 text-primary-600 focus:ring-primary-500 rounded cursor-pointer"
              />
              <label htmlFor="export-taxonomies" className="flex-1 cursor-pointer">
                <div className="font-medium">Taxonomies</div>
                <div className="text-sm text-gray-500">Categories, tags, and custom taxonomies</div>
              </label>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
              <input
                id="export-menus"
                type="checkbox"
                checked={exportOptions.menus}
                onChange={() => toggleOption('menus')}
                className="w-5 h-5 text-primary-600 focus:ring-primary-500 rounded cursor-pointer"
              />
              <label htmlFor="export-menus" className="flex-1 cursor-pointer">
                <div className="font-medium">Navigation Menus</div>
                <div className="text-sm text-gray-500">Menu structures and locations</div>
              </label>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
              <input
                id="export-post-types"
                type="checkbox"
                checked={exportOptions.postTypes}
                onChange={() => toggleOption('postTypes')}
                className="w-5 h-5 text-primary-600 focus:ring-primary-500 rounded cursor-pointer"
              />
              <label htmlFor="export-post-types" className="flex-1 cursor-pointer">
                <div className="font-medium">Post Types</div>
                <div className="text-sm text-gray-500">Custom post type definitions</div>
              </label>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
              <input
                id="export-settings"
                type="checkbox"
                checked={exportOptions.settings}
                onChange={() => toggleOption('settings')}
                className="w-5 h-5 text-primary-600 focus:ring-primary-500 rounded cursor-pointer"
              />
              <label htmlFor="export-settings" className="flex-1 cursor-pointer">
                <div className="font-medium">Settings</div>
                <div className="text-sm text-gray-500">Site configuration and preferences</div>
              </label>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 border border-yellow-200">
              <input
                id="export-users"
                type="checkbox"
                checked={exportOptions.users}
                onChange={() => toggleOption('users')}
                className="w-5 h-5 text-primary-600 focus:ring-primary-500 rounded cursor-pointer"
              />
              <label htmlFor="export-users" className="flex-1 cursor-pointer">
                <div className="font-medium flex items-center">
                  Users & Roles{' '}
                  <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">Sensitive</span>
                </div>
                <div className="text-sm text-gray-600">User accounts and permissions (passwords excluded)</div>
              </label>
            </div>
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
            Upload a JSON or ZIP file previously exported from Next CMS to import data.
          </p>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-6 text-center">
            <input
              type="file"
              id="import-file"
              accept=".json,.zip"
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
                JSON or ZIP files
              </div>
            </label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <span className="text-2xl mr-3">ℹ️</span>
              <div>
                <h3 className="font-medium text-blue-900 mb-1">Import Notes</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Supports JSON files and Full ZIP archives</li>
                  <li>• Existing content will not be duplicated</li>
                  <li>• New content will be added</li>
                  <li>• User passwords are never imported</li>
                  <li>• For ZIP files: media files are in the archive but must be manually extracted to uploads/ folder</li>
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

      {/* Format Information Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex">
          <span className="text-3xl mr-4">ℹ️</span>
          <div>
            <h3 className="font-bold text-blue-900 mb-2">Export Format Guide</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>
                <strong>JSON:</strong> Standard format for backing up and migrating between Next CMS sites. Can be imported back easily.
              </li>
              <li>
                <strong>XML (WordPress):</strong> WordPress WXR format for migrating content to/from WordPress. Includes posts, pages, and taxonomies.
              </li>
              <li>
                <strong>CSV:</strong> Exports data as multiple CSV files in a ZIP archive. Perfect for data analysis in Excel/Google Sheets. Cannot be imported.
              </li>
              <li>
                <strong>SQL:</strong> Database dump format. Can be executed directly on MySQL. Useful for advanced migrations and direct database operations.
              </li>
              <li>
                <strong>Full ZIP:</strong> Complete backup including JSON export AND actual media files. Largest file size but most complete backup solution.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Warning Section */}
      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex">
          <span className="text-3xl mr-4">⚠️</span>
          <div>
            <h3 className="font-bold text-yellow-900 mb-2">Important Reminders</h3>
            <ul className="text-sm text-yellow-800 space-y-2">
              <li>
                <strong>Backup First:</strong> Always create a backup before importing data to prevent accidental data loss.
              </li>
              <li>
                <strong>Media Files:</strong> JSON/XML/SQL/CSV exports only include media metadata. Use Full ZIP format to include actual files, or manually copy from <code className="bg-yellow-100 px-1">uploads/</code> directory.
              </li>
              <li>
                <strong>Database IDs:</strong> Imported content may have different IDs than the original, which could affect external references.
              </li>
              <li>
                <strong>Users:</strong> For security, user passwords are never exported or imported. Users will need to reset their passwords.
              </li>
              <li>
                <strong>CSV Format:</strong> CSV exports are for analysis only and cannot be imported back. Use JSON or SQL for backup/restore.
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

