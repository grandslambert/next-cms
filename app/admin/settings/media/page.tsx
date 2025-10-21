'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';

interface ImageSize {
  width: number;
  height: number;
  crop?: 'cover' | 'contain' | 'fill' | 'inside';
}

interface ImageSizes {
  [key: string]: ImageSize;
}

export default function MediaSettingsPage() {
  const { isLoading: permissionLoading } = usePermission('manage_settings');
  const [imageSizes, setImageSizes] = useState<ImageSizes>({
    thumbnail: { width: 150, height: 150, crop: 'cover' },
    medium: { width: 300, height: 300, crop: 'inside' },
    large: { width: 1024, height: 1024, crop: 'inside' },
  });
  const [allowedFileTypes, setAllowedFileTypes] = useState<string[]>([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ]);
  const [maxUploadSize, setMaxUploadSize] = useState('10');
  const [newFileType, setNewFileType] = useState('');
  const [newSizeName, setNewSizeName] = useState('');
  const [newSizeWidth, setNewSizeWidth] = useState('');
  const [newSizeHeight, setNewSizeHeight] = useState('');
  const [newSizeCrop, setNewSizeCrop] = useState<'cover' | 'contain' | 'fill' | 'inside'>('inside');
  const [regenerating, setRegenerating] = useState(false);
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
      if (data.settings.image_sizes) {
        setImageSizes(data.settings.image_sizes);
      }
      if (data.settings.allowed_file_types) {
        setAllowedFileTypes(data.settings.allowed_file_types);
      }
      if (data.settings.max_upload_size) {
        setMaxUploadSize(data.settings.max_upload_size.toString());
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
      toast.success('Media settings saved successfully');
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ 
      image_sizes: imageSizes,
      allowed_file_types: allowedFileTypes,
      max_upload_size: Number.parseInt(maxUploadSize),
    });
  };

  const handleSizeChange = (sizeName: string, field: 'width' | 'height' | 'crop', value: string | number) => {
    if (field === 'width' || field === 'height') {
      const numValue = parseInt(value as string) || 0;
      setImageSizes(prev => ({
        ...prev,
        [sizeName]: {
          ...prev[sizeName],
          [field]: numValue,
        },
      }));
    } else {
      setImageSizes(prev => ({
        ...prev,
        [sizeName]: {
          ...prev[sizeName],
          crop: value as any,
        },
      }));
    }
  };

  const handleAddSize = () => {
    if (!newSizeName || !newSizeWidth || !newSizeHeight) {
      toast.error('Please fill in all fields');
      return;
    }

    if (imageSizes[newSizeName]) {
      toast.error('A size with this name already exists');
      return;
    }

    setImageSizes(prev => ({
      ...prev,
      [newSizeName]: {
        width: parseInt(newSizeWidth),
        height: parseInt(newSizeHeight),
        crop: newSizeCrop,
      },
    }));

    setNewSizeName('');
    setNewSizeWidth('');
    setNewSizeHeight('');
    setNewSizeCrop('inside');
    toast.success('Image size added');
  };

  const handleRemoveSize = (sizeName: string) => {
    const { [sizeName]: removed, ...rest } = imageSizes;
    setImageSizes(rest);
    toast.success('Image size removed');
  };

  const handleAddFileType = () => {
    if (!newFileType) {
      toast.error('Please enter a file type');
      return;
    }

    // Validate MIME type format
    if (!newFileType.includes('/')) {
      toast.error('Invalid MIME type format. Example: image/jpeg');
      return;
    }

    if (allowedFileTypes.includes(newFileType)) {
      toast.error('This file type is already allowed');
      return;
    }

    setAllowedFileTypes(prev => [...prev, newFileType]);
    setNewFileType('');
    toast.success('File type added');
  };

  const handleRemoveFileType = (fileType: string) => {
    setAllowedFileTypes(prev => prev.filter(type => type !== fileType));
    toast.success('File type removed');
  };

  const handleRegenerateAll = async () => {
    if (!confirm('Regenerate ALL image sizes?\n\nThis will recreate all size variants for every image based on the current settings above. This may take a while for large libraries.\n\nMake sure you have saved your settings first!\n\nAre you sure you want to continue?')) {
      return;
    }

    setRegenerating(true);
    const loadingToast = toast.loading('Regenerating all images...');

    try {
      const res = await axios.post('/api/media/regenerate', { mediaId: null });
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.dismiss(loadingToast);
      
      if (res.data.failed > 0) {
        toast.error(`Regenerated ${res.data.success} images, ${res.data.failed} failed`, { duration: 5000 });
      } else {
        toast.success(`Successfully regenerated ${res.data.success} images!`, { duration: 5000 });
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to regenerate images');
    } finally {
      setRegenerating(false);
    }
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
          <h1 className="text-2xl font-bold">Media Settings</h1>
          <p className="text-sm text-gray-600">Configure file uploads, image sizes, and media handling</p>
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={handleRegenerateAll}
            disabled={regenerating || updateMutation.isPending}
            className="px-4 py-2 border border-orange-300 text-orange-700 bg-white rounded-lg hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            title="Apply current size settings to all existing images"
          >
            {regenerating ? '⏳ Regenerating...' : '🔄 Regenerate All'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={updateMutation.isPending || regenerating}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto h-[calc(100vh-8rem)]">
        <div className="max-w-7xl px-8 py-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Upload Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Allowed File Types (2/3 width) */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Allowed File Types</h2>
            <p className="text-sm text-gray-600 mb-6">
              Specify which MIME types are allowed for upload. Use standard MIME type format (e.g., image/jpeg).
            </p>

            <div className="space-y-2 mb-4">
              {allowedFileTypes.map((fileType, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-mono text-sm text-gray-900">{fileType}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFileType(fileType)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Add File Type + Upload Size (1/3 width) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add File Type</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    MIME Type
                  </label>
                  <input
                    type="text"
                    value={newFileType}
                    onChange={(e) => setNewFileType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                    placeholder="image/jpeg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Common: image/jpeg, image/png, image/gif, image/webp, application/pdf, video/mp4
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddFileType}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Add Type
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Limits</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Upload Size (MB)
                </label>
                <input
                  type="number"
                  value={maxUploadSize}
                  onChange={(e) => setMaxUploadSize(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="1"
                  max="100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum file size for uploads
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Image Sizes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Image Sizes (2/3 width) */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Image Sizes</h2>
            <p className="text-sm text-gray-600 mb-6">
              When images are uploaded, these sizes will be automatically generated.
            </p>

            <div className="space-y-4">
              {Object.entries(imageSizes).map(([sizeName, dimensions]) => (
                <div key={sizeName} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium text-gray-900 capitalize">{sizeName}</p>
                    {!['thumbnail', 'medium', 'large'].includes(sizeName) && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSize(sizeName)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600 w-12 flex-shrink-0">Width:</label>
                      <input
                        type="number"
                        value={dimensions.width}
                        onChange={(e) => handleSizeChange(sizeName, 'width', e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        min="1"
                        max="10000"
                      />
                      <span className="text-xs text-gray-500">px</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600 w-12 flex-shrink-0">Height:</label>
                      <input
                        type="number"
                        value={dimensions.height}
                        onChange={(e) => handleSizeChange(sizeName, 'height', e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        min="1"
                        max="10000"
                      />
                      <span className="text-xs text-gray-500">px</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600 w-12 flex-shrink-0">Crop:</label>
                      <select
                        value={dimensions.crop || 'inside'}
                        onChange={(e) => handleSizeChange(sizeName, 'crop', e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      >
                        <option value="inside">Fit Inside</option>
                        <option value="cover">Cover</option>
                        <option value="contain">Contain</option>
                        <option value="fill">Fill</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Add Custom Size (1/3 width) */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Custom Size</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Size Name
                </label>
                <input
                  type="text"
                  value={newSizeName}
                  onChange={(e) => setNewSizeName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="hero"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Width (px)
                </label>
                <input
                  type="number"
                  value={newSizeWidth}
                  onChange={(e) => setNewSizeWidth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="1920"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Height (px)
                </label>
                <input
                  type="number"
                  value={newSizeHeight}
                  onChange={(e) => setNewSizeHeight(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="1080"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Crop Style
                </label>
                <select
                  value={newSizeCrop}
                  onChange={(e) => setNewSizeCrop(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="inside">Fit Inside</option>
                  <option value="cover">Cover (crop)</option>
                  <option value="contain">Contain</option>
                  <option value="fill">Fill (stretch)</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleAddSize}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Add Size
              </button>

              <div className="mt-6 p-4 bg-gray-50 border border-gray-300 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-2">Crop Style Explanations:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li><strong>Fit Inside:</strong> Resize to fit within dimensions, maintain aspect ratio (no cropping)</li>
                  <li><strong>Cover:</strong> Fill the entire area, crop excess (exact dimensions, may crop sides)</li>
                  <li><strong>Contain:</strong> Fit entire image, add letterboxing if needed (no cropping, may have bars)</li>
                  <li><strong>Fill:</strong> Stretch to exact dimensions (may distort image)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box Below Grid */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 mb-2">
            <strong>Note:</strong> Image size changes only apply to newly uploaded images. 
            To apply new settings to existing images, use the "Regenerate All" button in the header.
          </p>
          <p className="text-sm text-blue-800">
            <strong>File Type & Upload Size:</strong> Changes take effect immediately for all new uploads.
          </p>
        </div>
      </form>
        </div>
      </div>
    </div>
  );
}

