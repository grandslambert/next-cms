'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';

export default function MediaPage() {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      const res = await axios.get('/api/media?limit=100');
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`/api/media/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Media deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete media');
    },
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

  const handleDelete = async (id: number, filename: string) => {
    if (confirm(`Are you sure you want to delete "${filename}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Media Library</h1>
          <p className="text-gray-600 mt-2">Upload and manage your media files</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,video/*,application/pdf"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : '+ Upload Files'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : data?.media && data.media.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {data.media.map((item: any) => (
              <div key={item.id} className="group relative bg-gray-100 rounded-lg overflow-hidden">
                <div className="aspect-square">
                  {item.mime_type.startsWith('image/') ? (
                    <img
                      src={item.url}
                      alt={item.original_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      📄
                    </div>
                  )}
                </div>
                
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => copyToClipboard(item.url)}
                      className="px-3 py-2 bg-white text-gray-900 rounded hover:bg-gray-100 text-sm"
                      title="Copy URL"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.original_name)}
                      className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="p-2 bg-white">
                  <p className="text-xs text-gray-900 truncate font-medium" title={item.original_name}>
                    {item.original_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(item.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <div className="text-6xl mb-4">🖼️</div>
            <p className="text-lg">No media files yet</p>
            <p className="text-sm mt-2">Click the "Upload Files" button to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

