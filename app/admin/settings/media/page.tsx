'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

interface ImageSize {
  width: number;
  height: number;
  crop?: 'cover' | 'contain' | 'fill' | 'inside';
}

interface ImageSizes {
  [key: string]: ImageSize;
}

export default function MediaSettingsPage() {
  const [imageSizes, setImageSizes] = useState<ImageSizes>({
    thumbnail: { width: 150, height: 150, crop: 'cover' },
    medium: { width: 300, height: 300, crop: 'inside' },
    large: { width: 1024, height: 1024, crop: 'inside' },
  });
  const [newSizeName, setNewSizeName] = useState('');
  const [newSizeWidth, setNewSizeWidth] = useState('');
  const [newSizeHeight, setNewSizeHeight] = useState('');
  const [newSizeCrop, setNewSizeCrop] = useState<'cover' | 'contain' | 'fill' | 'inside'>('inside');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await axios.get('/api/settings');
      return res.data;
    },
  });

  useEffect(() => {
    if (data?.settings?.image_sizes) {
      setImageSizes(data.settings.image_sizes);
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
    updateMutation.mutate({ image_sizes: imageSizes });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Image Sizes</h2>
          <p className="text-sm text-gray-600 mb-6">
            When images are uploaded, these sizes will be automatically generated. Changes apply to new uploads only.
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600 w-16">Width:</label>
                    <input
                      type="number"
                      value={dimensions.width}
                      onChange={(e) => handleSizeChange(sizeName, 'width', e.target.value)}
                      className="flex-1 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                      min="1"
                      max="10000"
                    />
                    <span className="text-sm text-gray-500">px</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600 w-16">Height:</label>
                    <input
                      type="number"
                      value={dimensions.height}
                      onChange={(e) => handleSizeChange(sizeName, 'height', e.target.value)}
                      className="flex-1 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                      min="1"
                      max="10000"
                    />
                    <span className="text-sm text-gray-500">px</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600 w-16">Crop:</label>
                    <select
                      value={dimensions.crop || 'inside'}
                      onChange={(e) => handleSizeChange(sizeName, 'crop', e.target.value)}
                      className="flex-1 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    >
                      <option value="inside">Fit Inside (no crop)</option>
                      <option value="cover">Cover (crop to fill)</option>
                      <option value="contain">Contain (fit, add padding)</option>
                      <option value="fill">Fill (stretch)</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Custom Size</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddSize}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Add Size
              </button>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 border border-gray-300 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-2">Crop Style Explanations:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li><strong>Fit Inside:</strong> Resize to fit within dimensions, maintain aspect ratio (no cropping)</li>
              <li><strong>Cover:</strong> Fill the entire area, crop excess (exact dimensions, may crop sides)</li>
              <li><strong>Contain:</strong> Fit entire image, add letterboxing if needed (no cropping, may have bars)</li>
              <li><strong>Fill:</strong> Stretch to exact dimensions (may distort image)</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Custom image sizes only apply to newly uploaded images. 
              Existing images will not be regenerated.
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Media Settings'}
          </button>
          
          <p className="text-sm text-gray-500">
            {Object.keys(imageSizes).length} image size{Object.keys(imageSizes).length !== 1 ? 's' : ''} configured
          </p>
        </div>
      </form>
    </div>
  );
}

