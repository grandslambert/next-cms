'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingOverlay from './LoadingOverlay';

interface TrashViewProps {
  readonly onClose: () => void;
}

export default function TrashView({ onClose }: TrashViewProps) {
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch trashed media
  const { data, isLoading } = useQuery({
    queryKey: ['media', 'trash'],
    queryFn: async () => {
      const res = await axios.get('/api/media?limit=100&trash=true');
      return res.data;
    },
  });

  const restoreMediaMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.post(`/api/media/${id}/restore`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['media-trash-count'] });
      toast.success('Media restored successfully');
    },
    onError: () => {
      toast.error('Failed to restore media');
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.delete(`/api/media/${id}/permanent-delete`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['media-trash-count'] });
      toast.success('Media permanently deleted');
    },
    onError: () => {
      toast.error('Failed to permanently delete media');
    },
  });

  const emptyTrashMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post('/api/media/trash/empty');
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['media-trash-count'] });
      toast.success(data.message);
    },
    onError: () => {
      toast.error('Failed to empty trash');
    },
  });

  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, media_ids }: { action: string; media_ids: string[] }) => {
      const res = await axios.post('/api/media/bulk', { action, media_ids });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['media-trash-count'] });
      toast.success(data.message);
      setSelectedMedia([]);
      setBulkAction('');
    },
    onError: () => {
      toast.error('Failed to perform bulk action');
    },
  });

  const handleSelectMedia = (id: number) => {
    setSelectedMedia(prev =>
      prev.includes(id) ? prev.filter(mediaId => mediaId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (data?.media) {
      if (selectedMedia.length === data.media.length) {
        setSelectedMedia([]);
      } else {
        setSelectedMedia(data.media.map((item: any) => item.id));
      }
    }
  };

  const handleBulkAction = () => {
    if (selectedMedia.length === 0) {
      toast.error('Please select at least one item');
      return;
    }

    if (!bulkAction) {
      toast.error('Please select an action');
      return;
    }

    if (bulkAction === 'permanent-delete') {
      if (!confirm(`⚠️ PERMANENTLY delete ${selectedMedia.length} selected item${selectedMedia.length !== 1 ? 's' : ''}?\n\nThis action cannot be undone and will delete all files from the server.`)) {
        return;
      }
    }

    bulkActionMutation.mutate({ action: bulkAction, media_ids: selectedMedia });
  };

  const handleRestoreMedia = (id: number, name: string) => {
    if (confirm(`Restore "${name}" from trash?`)) {
      restoreMediaMutation.mutate(id);
    }
  };

  const handlePermanentDelete = (id: number, name: string) => {
    if (confirm(`⚠️ PERMANENTLY delete "${name}"?\n\nThis action cannot be undone and will delete all file sizes from the server.`)) {
      permanentDeleteMutation.mutate(id);
    }
  };

  const handleEmptyTrash = () => {
    if (confirm(`⚠️ PERMANENTLY delete ALL items in trash?\n\nThis will delete ${data?.media?.length || 0} file(s) and cannot be undone.`)) {
      emptyTrashMutation.mutate();
    }
  };

  const allMediaSelected = data?.media && data.media.length > 0 && selectedMedia.length === data.media.length;

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-red-600">🗑️ Trash</h2>
            <p className="text-sm text-gray-600">Deleted media files from all folders</p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
          >
            ← Back to Media
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {selectedMedia.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">
                {selectedMedia.length} selected
              </span>
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-sm"
              >
                <option value="">Bulk Actions</option>
                <option value="restore">Restore</option>
                <option value="permanent-delete">Delete Permanently</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction || bulkActionMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 text-sm"
              >
                Apply
              </button>
            </div>
          )}

          {/* Empty Trash Button */}
          {data?.media && data.media.length > 0 && (
            <button
              onClick={handleEmptyTrash}
              disabled={emptyTrashMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm"
            >
              {emptyTrashMutation.isPending ? 'Emptying...' : '🗑️ Empty Trash'}
            </button>
          )}
        </div>
      </div>

      {/* Media Grid */}
      <div className="bg-white rounded-lg shadow p-6">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : data?.media && data.media.length > 0 ? (
          <>
            {/* Select All */}
            <div className="mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allMediaSelected}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  Select All ({data.media.length} items)
                </span>
              </label>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {data.media.map((item: any) => (
                <div 
                  key={item.id} 
                  className={`group relative bg-gray-100 rounded-lg overflow-hidden ${
                    selectedMedia.includes(item.id) ? 'ring-2 ring-primary-600' : ''
                  }`}
                >
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedMedia.includes(item.id)}
                      onChange={() => handleSelectMedia(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 bg-white"
                    />
                  </div>

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
                    <div className="flex flex-wrap gap-2 justify-center px-2">
                      <button
                        onClick={() => handleRestoreMedia(item.id, item.original_name)}
                        className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        title="Restore"
                      >
                        ↩️
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(item.id, item.original_name)}
                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        title="Delete Permanently"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="p-2 bg-white">
                    <p className="text-xs text-gray-900 truncate font-medium" title={item.title || item.original_name}>
                      {item.title || item.original_name}
                    </p>
                    {item.alt_text && (
                      <p className="text-xs text-gray-600 truncate" title={item.alt_text}>
                        Alt: {item.alt_text}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {(item.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <div className="text-6xl mb-4">🗑️</div>
            <p className="text-lg">Trash is empty</p>
            <p className="text-sm mt-2">Deleted media files will appear here</p>
          </div>
        )}
      </div>

      <LoadingOverlay 
        isVisible={bulkActionMutation.isPending || emptyTrashMutation.isPending}
        message={
          bulkActionMutation.isPending 
            ? `Processing ${selectedMedia.length} item${selectedMedia.length !== 1 ? 's' : ''}...`
            : 'Emptying trash...'
        }
      />
    </div>
  );
}

