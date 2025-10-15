'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import { usePermission } from '@/hooks/usePermission';

interface UploadProgress {
  name: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

export default function MediaPage() {
  const { isLoading: permissionLoading } = usePermission('manage_media');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [editingMedia, setEditingMedia] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAltText, setEditAltText] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      const res = await axios.get('/api/media?limit=100');
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, title, alt_text }: { id: number; title: string; alt_text: string }) => {
      const res = await axios.put(`/api/media/${id}`, { title, alt_text });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Media updated successfully');
      setEditingMedia(null);
    },
    onError: () => {
      toast.error('Failed to update media');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await axios.delete(`/api/media/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      
      // Invalidate related queries if image was used
      if (data.cleared_references && data.cleared_references.total > 0) {
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        queryClient.invalidateQueries({ queryKey: ['pages'] });
        queryClient.invalidateQueries({ queryKey: ['categories'] });
      }
      
      let message = 'Media deleted successfully';
      if (data.cleared_references && data.cleared_references.total > 0) {
        const { posts, pages, categories, total } = data.cleared_references;
        message += ` (cleared from ${total} location`;
        if (total > 1) message += 's';
        message += `: ${posts} posts, ${pages} pages, ${categories} categories)`;
      }
      
      toast.success(message, { duration: 5000 });
    },
    onError: () => {
      toast.error('Failed to delete media');
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    // Initialize progress for all files
    const filesArray = Array.from(files);
    const initialProgress: UploadProgress[] = filesArray.map(file => ({
      name: file.name,
      progress: 0,
      status: 'uploading' as const,
    }));
    setUploadProgress(initialProgress);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        await axios.post('/api/media', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            
            setUploadProgress(prev => 
              prev.map((item, index) => 
                index === i 
                  ? { ...item, progress: percentCompleted }
                  : item
              )
            );
          },
        });

        // Mark as completed
        setUploadProgress(prev => 
          prev.map((item, index) => 
            index === i 
              ? { ...item, progress: 100, status: 'completed' }
              : item
          )
        );
        
        successCount++;
      } catch (error) {
        // Mark as error
        setUploadProgress(prev => 
          prev.map((item, index) => 
            index === i 
              ? { ...item, status: 'error' }
              : item
          )
        );
        
        errorCount++;
      }
    }

    queryClient.invalidateQueries({ queryKey: ['media'] });
    
    if (errorCount === 0) {
      toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully`);
    } else if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded, ${errorCount} failed`);
    } else {
      toast.error('Failed to upload files');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Clear progress after a delay
    setTimeout(() => {
      setUploadProgress([]);
      setUploading(false);
    }, 2000);
  };

  const handleDelete = async (id: number, filename: string) => {
    try {
      // Check where the image is used
      const usageRes = await axios.get(`/api/media/${id}/usage`);
      const usage = usageRes.data.usage;

      let confirmMessage = `Are you sure you want to delete "${filename}"?`;

      if (usage.total > 0) {
        confirmMessage = `⚠️ WARNING: This image is currently being used in:\n\n`;
        
        if (usage.posts.length > 0) {
          confirmMessage += `📝 ${usage.posts.length} Post(s):\n`;
          usage.posts.forEach((post: any) => {
            confirmMessage += `   - ${post.title}\n`;
          });
          confirmMessage += '\n';
        }
        
        if (usage.pages.length > 0) {
          confirmMessage += `📄 ${usage.pages.length} Page(s):\n`;
          usage.pages.forEach((page: any) => {
            confirmMessage += `   - ${page.title}\n`;
          });
          confirmMessage += '\n';
        }
        
        if (usage.categories.length > 0) {
          confirmMessage += `🏷️ ${usage.categories.length} Categories:\n`;
          usage.categories.forEach((cat: any) => {
            confirmMessage += `   - ${cat.name}\n`;
          });
          confirmMessage += '\n';
        }

        confirmMessage += `If you delete this image, it will be removed from all these locations.\n\nAre you sure you want to continue?`;
      }

      if (confirm(confirmMessage)) {
        deleteMutation.mutate(id);
      }
    } catch (error) {
      console.error('Error checking usage:', error);
      // Fallback to simple confirmation
      if (confirm(`Are you sure you want to delete "${filename}"?`)) {
        deleteMutation.mutate(id);
      }
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  };

  const handleEdit = (item: any) => {
    setEditingMedia(item);
    setEditTitle(item.title || '');
    setEditAltText(item.alt_text || '');
  };

  const handleSaveEdit = () => {
    if (editingMedia) {
      updateMutation.mutate({
        id: editingMedia.id,
        title: editTitle,
        alt_text: editAltText,
      });
    }
  };

  const handleRegenerateOne = async (id: number, name: string) => {
    if (!confirm(`Regenerate image sizes for "${name}"?\n\nThis will recreate all size variants based on current settings.`)) {
      return;
    }

    setRegenerating(true);
    try {
      const res = await axios.post('/api/media/regenerate', { mediaId: id });
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success(`Successfully regenerated sizes for ${name}`);
      setEditingMedia(null);
    } catch (error) {
      toast.error('Failed to regenerate image sizes');
    } finally {
      setRegenerating(false);
    }
  };

  const handleRegenerateAll = async () => {
    if (!confirm('Regenerate ALL image sizes?\n\nThis will recreate all size variants for every image based on current settings. This may take a while for large libraries.\n\nAre you sure you want to continue?')) {
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

  if (permissionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Media Library</h1>
          <p className="text-gray-600 mt-2">Upload and manage your media files</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRegenerateAll}
            disabled={regenerating || uploading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Regenerate all image sizes based on current settings"
          >
            {regenerating ? '⏳ Regenerating...' : '🔄 Regenerate All'}
          </button>
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
            disabled={uploading || regenerating}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : '+ Upload Files'}
          </button>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="mb-6 space-y-3">
          {uploadProgress.map((file, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{file.name}</span>
                  {file.status === 'completed' && (
                    <span className="text-green-600">✓</span>
                  )}
                  {file.status === 'error' && (
                    <span className="text-red-600">✗</span>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {file.status === 'uploading' && `${file.progress}%`}
                  {file.status === 'completed' && 'Complete'}
                  {file.status === 'error' && 'Failed'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    file.status === 'completed' 
                      ? 'bg-green-500' 
                      : file.status === 'error'
                      ? 'bg-red-500'
                      : 'bg-primary-600'
                  }`}
                  style={{ width: `${file.status === 'error' ? 100 : file.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

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
                      onClick={() => handleEdit(item)}
                      className="px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm"
                      title="Edit Details"
                    >
                      ✏️
                    </button>
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
        ) : (
          <div className="p-8 text-center text-gray-500">
            <div className="text-6xl mb-4">🖼️</div>
            <p className="text-lg">No media files yet</p>
            <p className="text-sm mt-2">Click the "Upload Files" button to get started</p>
          </div>
        )}
      </div>

      {/* Edit Media Modal */}
      {editingMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Edit Media Details</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Preview */}
              <div className="flex justify-center">
                {editingMedia.mime_type.startsWith('image/') ? (
                  <img
                    src={editingMedia.url}
                    alt={editingMedia.title || editingMedia.original_name}
                    className="max-w-full max-h-64 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center text-6xl bg-gray-100 rounded-lg">
                    📄
                  </div>
                )}
              </div>

              {/* Filename */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filename
                </label>
                <p className="text-sm text-gray-600">{editingMedia.original_name}</p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter a descriptive title"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will be displayed in the media library
                </p>
              </div>

              {/* Alt Text */}
              {editingMedia.mime_type.startsWith('image/') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alt Text
                  </label>
                  <input
                    type="text"
                    value={editAltText}
                    onChange={(e) => setEditAltText(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Describe this image for accessibility"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Helps screen readers and improves SEO
                  </p>
                </div>
              )}

              {/* File Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">File Size</p>
                  <p className="text-sm font-medium text-gray-900">
                    {(editingMedia.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="text-sm font-medium text-gray-900">
                    {editingMedia.mime_type}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Uploaded</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(editingMedia.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">URL</p>
                  <button
                    onClick={() => copyToClipboard(editingMedia.url)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Copy URL 📋
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between items-center">
              <div>
                {editingMedia.mime_type.startsWith('image/') && (
                  <button
                    onClick={() => handleRegenerateOne(editingMedia.id, editingMedia.title || editingMedia.original_name)}
                    disabled={regenerating || updateMutation.isPending}
                    className="px-4 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50"
                    title="Regenerate all size variants for this image"
                  >
                    {regenerating ? '⏳ Regenerating...' : '🔄 Regenerate Sizes'}
                  </button>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setEditingMedia(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={updateMutation.isPending || regenerating}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

