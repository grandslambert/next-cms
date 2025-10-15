'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

interface MediaSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mediaId: number, url: string) => void;
  currentMediaId?: number;
}

export default function MediaSelector({ isOpen, onClose, onSelect, currentMediaId }: MediaSelectorProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      const res = await axios.get('/api/media?limit=100');
      return res.data;
    },
    enabled: isOpen, // Only fetch when modal is open
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        await axios.post('/api/media', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Files uploaded successfully');
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleImageClick = (item: any) => {
    // Pass both ID and URL - ID is stored in database
    onSelect(item.id, item.url);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Select Media</h2>
              <p className="text-sm text-gray-600 mt-1">Choose an image or upload a new one</p>
            </div>
            <div className="flex items-center space-x-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 text-sm"
              >
                {uploading ? 'Uploading...' : '📤 Upload'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : data?.media && data.media.length > 0 ? (
              /* Media Grid View */
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {data.media.map((item: any) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleImageClick(item)}
                    className={`group relative bg-gray-100 rounded-lg overflow-hidden hover:ring-4 hover:ring-primary-500 transition-all ${
                      currentMediaId === item.id ? 'ring-4 ring-primary-600' : ''
                    }`}
                  >
                    <div className="aspect-square">
                      {item.mime_type.startsWith('image/') ? (
                        <img
                          src={item.sizes ? JSON.parse(item.sizes).thumbnail?.url || item.url : item.url}
                          alt={item.original_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          📄
                        </div>
                      )}
                    </div>
                    
                    {/* Checkmark overlay for selected */}
                    {currentMediaId === item.id && (
                      <div className="absolute inset-0 bg-primary-600 bg-opacity-30 flex items-center justify-center">
                        <div className="bg-white rounded-full p-2">
                          <span className="text-2xl">✓</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="text-white font-semibold">Select</span>
                    </div>

                    <div className="p-2 bg-white">
                      <p className="text-xs text-gray-900 truncate" title={item.original_name}>
                        {item.original_name}
                      </p>
                      {item.sizes && (
                        <p className="text-xs text-gray-500">Multiple sizes</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🖼️</div>
                <p className="text-lg text-gray-900 mb-2">No media files yet</p>
                <p className="text-sm text-gray-600">Upload your first image to get started</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-4 flex justify-between items-center bg-gray-50">
            <p className="text-sm text-gray-600">
              {data?.media ? `${data.media.length} items` : ''}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

