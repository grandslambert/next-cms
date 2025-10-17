'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';
import MediaUploadProgress from '@/components/admin/media/MediaUploadProgress';
import MediaGrid from '@/components/admin/media/MediaGrid';
import EditMediaModal from '@/components/admin/media/EditMediaModal';
import FolderModal from '@/components/admin/media/FolderModal';
import MoveMediaModal from '@/components/admin/media/MoveMediaModal';
import BulkMoveModal from '@/components/admin/media/BulkMoveModal';
import LoadingOverlay from '@/components/admin/media/LoadingOverlay';
import TrashView from '@/components/admin/media/TrashView';

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
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: number | null; name: string }[]>([{ id: null, name: 'Media Library' }]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<any>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [movingMedia, setMovingMedia] = useState<any>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [deletingFolder, setDeletingFolder] = useState<any>(null);
  const [folderMediaCount, setFolderMediaCount] = useState(0);
  const [folderSubfolderCount, setFolderSubfolderCount] = useState(0);
  const [deleteAction, setDeleteAction] = useState<'move' | 'delete'>('move');
  const [moveToFolderId, setMoveToFolderId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch folders in current directory
  const { data: foldersData } = useQuery({
    queryKey: ['media-folders', currentFolderId],
    queryFn: async () => {
      const parentParam = currentFolderId === null ? 'null' : currentFolderId;
      const res = await axios.get(`/api/media/folders?parent_id=${parentParam}`);
      return res.data;
    },
  });

  // Fetch ALL folders for move/delete operations
  const { data: allFoldersData } = useQuery({
    queryKey: ['all-media-folders'],
    queryFn: async () => {
      const res = await axios.get('/api/media/folders/all');
      return res.data;
    },
  });

  // Fetch media in current folder
  const { data, isLoading } = useQuery({
    queryKey: ['media', currentFolderId, showTrash],
    queryFn: async () => {
      const folderParam = currentFolderId === null ? '&folder_id=' : `&folder_id=${currentFolderId}`;
      const trashParam = showTrash ? '&trash=true' : '';
      const res = await axios.get(`/api/media?limit=100${folderParam}${trashParam}`);
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

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await axios.post('/api/media/folders', { name, parent_id: currentFolderId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      queryClient.invalidateQueries({ queryKey: ['all-media-folders'] });
      toast.success('Folder created successfully');
      setShowNewFolderModal(false);
      setNewFolderName('');
    },
    onError: () => {
      toast.error('Failed to create folder');
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await axios.put(`/api/media/folders/${id}`, { name, parent_id: editingFolder?.parent_id });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      queryClient.invalidateQueries({ queryKey: ['all-media-folders'] });
      toast.success('Folder renamed successfully');
      setShowRenameFolderModal(false);
      setEditingFolder(null);
      setNewFolderName('');
    },
    onError: () => {
      toast.error('Failed to rename folder');
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async ({ id, action, targetFolderId }: { id: number; action?: string; targetFolderId?: number | null }) => {
      let url = `/api/media/folders/${id}`;
      if (action) {
        url += `?action=${action}`;
        if (action === 'move') {
          url += `&target_folder_id=${targetFolderId === null ? 'null' : targetFolderId}`;
        }
      }
      const res = await axios.delete(url);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      queryClient.invalidateQueries({ queryKey: ['all-media-folders'] });
      queryClient.invalidateQueries({ queryKey: ['media'] });
      
      const parts = [];
      if (data.folders_deleted > 1) {
        parts.push(`${data.folders_deleted} folders`);
      } else {
        parts.push('Folder');
      }
      
      if (data.media_moved > 0) {
        parts.push(`${data.media_moved} file(s) moved`);
      } else if (data.media_deleted > 0) {
        parts.push(`${data.media_deleted} file(s) deleted`);
      }
      
      toast.success(parts.join(' - ') + ' deleted successfully');
      setShowDeleteFolderModal(false);
      setDeletingFolder(null);
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      
      // If the folder has media files and requires action, show the modal
      if (errorData?.requires_action) {
        setFolderMediaCount(errorData.media_count || 0);
        setFolderSubfolderCount(errorData.subfolder_count || 0);
        setShowDeleteFolderModal(true);
        return;
      }
      
      const errorMessage = errorData?.error || 'Failed to delete folder';
      toast.error(errorMessage);
    },
  });

  const moveMediaMutation = useMutation({
    mutationFn: async ({ id, folder_id }: { id: number; folder_id: number | null }) => {
      const res = await axios.put(`/api/media/${id}/move`, { folder_id });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      queryClient.invalidateQueries({ queryKey: ['all-media-folders'] });
      toast.success('Media moved successfully');
      setShowMoveModal(false);
      setMovingMedia(null);
    },
    onError: () => {
      toast.error('Failed to move media');
    },
  });

  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, media_ids, folder_id }: { action: string; media_ids: number[]; folder_id?: number | null }) => {
      const res = await axios.post('/api/media/bulk', { action, media_ids, folder_id });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      queryClient.invalidateQueries({ queryKey: ['all-media-folders'] });
      toast.success(data.message);
      setSelectedMedia([]);
      setBulkAction('');
    },
    onError: () => {
      toast.error('Failed to perform bulk action');
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
      if (currentFolderId) {
        formData.append('folder_id', currentFolderId.toString());
      }

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

  const handleOpenFolder = (folder: any) => {
    setCurrentFolderId(folder.id);
    setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    setCurrentFolderId(newPath.at(-1)?.id ?? null);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }
    createFolderMutation.mutate(newFolderName.trim());
  };

  const handleRenameFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }
    renameFolderMutation.mutate({ id: editingFolder.id, name: newFolderName.trim() });
  };

  const handleDeleteFolder = async (folder: any) => {
    setDeletingFolder(folder);
    setDeleteAction('move');
    setMoveToFolderId(null);
    
    // Try to delete - if it has contents, the API will return info for confirmation
    deleteFolderMutation.mutate({ id: folder.id });
  };

  const handleConfirmDeleteFolder = () => {
    if (!deletingFolder) return;
    
    deleteFolderMutation.mutate({
      id: deletingFolder.id,
      action: deleteAction,
      targetFolderId: deleteAction === 'move' ? moveToFolderId : undefined
    });
  };

  // Handle ESC key to close delete folder modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDeleteFolderModal) {
        setShowDeleteFolderModal(false);
        setDeletingFolder(null);
      }
    };

    if (showDeleteFolderModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showDeleteFolderModal]);

  // Get available folders (excluding the folder being deleted and its descendants)
  const getAvailableFolders = () => {
    if (!allFoldersData?.folders || !deletingFolder) return [];
    
    // Build a set of folder IDs to exclude (the deleting folder and all its descendants)
    const excludeIds = new Set<number>([deletingFolder.id]);
    
    // Find all descendants by checking parent_id chain
    const findDescendants = (parentId: number) => {
      allFoldersData.folders.forEach((folder: any) => {
        if (folder.parent_id === parentId && !excludeIds.has(folder.id)) {
          excludeIds.add(folder.id);
          findDescendants(folder.id);
        }
      });
    };
    
    findDescendants(deletingFolder.id);
    
    // Return folders not in exclude list
    return allFoldersData.folders.filter((f: any) => !excludeIds.has(f.id));
  };

  const handleMoveMedia = (targetFolderId: number | null) => {
    if (movingMedia) {
      moveMediaMutation.mutate({ id: movingMedia.id, folder_id: targetFolderId });
    }
  };

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

    if (bulkAction === 'move') {
      setShowBulkMoveModal(true);
      return;
    }

    if (bulkAction === 'permanent-delete') {
      if (!confirm(`⚠️ PERMANENTLY delete ${selectedMedia.length} selected item${selectedMedia.length !== 1 ? 's' : ''}?\n\nThis action cannot be undone and will delete all files from the server.`)) {
        return;
      }
    }

    bulkActionMutation.mutate({ action: bulkAction, media_ids: selectedMedia });
  };

  const handleBulkMove = (folderId: number | null) => {
    bulkActionMutation.mutate({ action: 'move', media_ids: selectedMedia, folder_id: folderId });
    setShowBulkMoveModal(false);
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

  // If viewing trash, show TrashView component
  if (showTrash) {
    return <TrashView onClose={() => setShowTrash(false)} />;
  }

  return (
    <div className="-m-8 h-[calc(100vh-4rem)]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Media Library</h1>
          <p className="text-sm text-gray-600">Upload and manage your media files</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowTrash(true)}
            className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            🗑️ Trash
          </button>
          <button
            onClick={handleRegenerateAll}
            disabled={regenerating || uploading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Regenerate all image sizes based on current settings"
          >
            {regenerating ? '⏳ Regenerating...' : '🔄 Regenerate All'}
          </button>
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
          >
            📁 New Folder
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

      {/* Scrollable Content */}
      <div className="overflow-y-auto h-[calc(100vh-8rem)]">
        <div className="px-8 py-6">

      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 mb-4 text-sm">
        {folderPath.map((folder, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <span className="text-gray-400 mx-2">/</span>}
            <button
              onClick={() => handleBreadcrumbClick(index)}
              className={`hover:text-primary-600 transition-colors ${
                index === folderPath.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-600'
              }`}
            >
              {folder.name}
            </button>
          </div>
        ))}
      </div>

      {/* Bulk Actions */}
      {selectedMedia.length > 0 && (
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-sm text-gray-700">
            {selectedMedia.length} selected
          </span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-sm"
          >
            <option value="">Bulk Actions</option>
            <option value="move">Move to Folder</option>
            <option value="trash">Move to Trash</option>
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

      {/* Upload Progress */}
      <MediaUploadProgress uploadProgress={uploadProgress} />

      <div className="bg-white rounded-lg shadow p-6">
        <MediaGrid
          folders={foldersData?.folders || []}
          media={data?.media || []}
          isLoading={isLoading}
          showTrash={false}
          selectedMedia={selectedMedia}
          onOpenFolder={handleOpenFolder}
          onEditFolder={(folder) => {
            setEditingFolder(folder);
            setNewFolderName(folder.name);
            setShowRenameFolderModal(true);
          }}
          onDeleteFolder={handleDeleteFolder}
          onEditMedia={handleEdit}
          onMoveMedia={(item) => {
            setMovingMedia(item);
            setShowMoveModal(true);
          }}
          onCopyUrl={copyToClipboard}
          onDeleteMedia={handleDelete}
          onDropMedia={(mediaId, folderId) => {
            moveMediaMutation.mutate({ id: mediaId, folder_id: folderId });
          }}
          onSelectMedia={handleSelectMedia}
          onSelectAll={handleSelectAll}
        />
      </div>

      {/* Modals */}
      <EditMediaModal
        isOpen={!!editingMedia}
        media={editingMedia}
        title={editTitle}
        altText={editAltText}
        isPending={updateMutation.isPending}
        isRegenerating={regenerating}
        onClose={() => setEditingMedia(null)}
        onSave={handleSaveEdit}
        onTitleChange={setEditTitle}
        onAltTextChange={setEditAltText}
        onCopyUrl={copyToClipboard}
        onRegenerate={() => editingMedia && handleRegenerateOne(editingMedia.id, editingMedia.title || editingMedia.original_name)}
      />

      <FolderModal
        isOpen={showNewFolderModal}
        mode="create"
        folderName={newFolderName}
        isPending={createFolderMutation.isPending}
        onClose={() => {
          setShowNewFolderModal(false);
          setNewFolderName('');
        }}
        onSubmit={handleCreateFolder}
        onNameChange={setNewFolderName}
      />

      <FolderModal
        isOpen={showRenameFolderModal}
        mode="rename"
        folderName={newFolderName}
        isPending={renameFolderMutation.isPending}
        onClose={() => {
          setShowRenameFolderModal(false);
          setEditingFolder(null);
          setNewFolderName('');
        }}
        onSubmit={handleRenameFolder}
        onNameChange={setNewFolderName}
      />

      <MoveMediaModal
        isOpen={showMoveModal}
        media={movingMedia}
        folders={allFoldersData?.folders || []}
        onClose={() => {
          setShowMoveModal(false);
          setMovingMedia(null);
        }}
        onMove={handleMoveMedia}
      />

      <BulkMoveModal
        isOpen={showBulkMoveModal}
        selectedCount={selectedMedia.length}
        folders={allFoldersData?.folders || []}
        currentFolderId={currentFolderId}
        onClose={() => setShowBulkMoveModal(false)}
        onMove={handleBulkMove}
      />

      {/* Delete Folder Confirmation Modal */}
      {showDeleteFolderModal && deletingFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Delete Folder with Contents
            </h2>
            <p className="text-gray-600 mb-4">
              The folder <strong>&quot;{deletingFolder.name}&quot;</strong> contains:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-1">
              {folderMediaCount > 0 && (
                <li>{folderMediaCount} media file{folderMediaCount !== 1 ? 's' : ''}</li>
              )}
              {folderSubfolderCount > 0 && (
                <li>{folderSubfolderCount} subfolder{folderSubfolderCount !== 1 ? 's' : ''} (will be deleted recursively)</li>
              )}
            </ul>
            <p className="text-gray-600 mb-4">
              What would you like to do with the media files?
            </p>

            <div className="space-y-3 mb-6">
              <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="delete-action"
                  value="move"
                  checked={deleteAction === 'move'}
                  onChange={(e) => setDeleteAction(e.target.value as 'move')}
                  className="mt-1"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">Move files to another folder</div>
                  <div className="text-sm text-gray-600">Select a destination folder below</div>
                  
                  {deleteAction === 'move' && (
                    <select
                      value={moveToFolderId === null ? 'null' : moveToFolderId}
                      onChange={(e) => setMoveToFolderId(e.target.value === 'null' ? null : Number.parseInt(e.target.value))}
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="null">📁 Root / Media Library</option>
                      {getAvailableFolders().map((folder: any) => (
                        <option key={folder.id} value={folder.id}>
                          📁 {folder.display_name || folder.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </label>

              <label className="flex items-start p-3 border border-red-200 rounded-lg cursor-pointer hover:bg-red-50">
                <input
                  type="radio"
                  name="delete-action"
                  value="delete"
                  checked={deleteAction === 'delete'}
                  onChange={(e) => setDeleteAction(e.target.value as 'delete')}
                  className="mt-1"
                  aria-label="Delete all files permanently"
                />
                <div className="ml-3">
                  <div className="font-medium text-red-900">Delete all files permanently</div>
                  <div className="text-sm text-red-600">⚠️ This will remove all {folderMediaCount} file{folderMediaCount !== 1 ? 's' : ''} from the server</div>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteFolderModal(false);
                  setDeletingFolder(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                disabled={deleteFolderMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteFolder}
                disabled={deleteFolderMutation.isPending}
                className={`px-4 py-2 rounded-md text-white ${
                  deleteAction === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-primary-600 hover:bg-primary-700'
                } disabled:opacity-50`}
              >
                {deleteFolderMutation.isPending ? 'Processing...' : deleteAction === 'delete' ? 'Delete All' : 'Move & Delete Folder'}
              </button>
            </div>
          </div>
        </div>
      )}

      <LoadingOverlay 
        isVisible={bulkActionMutation.isPending}
        message={`Processing ${selectedMedia.length} item${selectedMedia.length !== 1 ? 's' : ''}...`}
      />

      <LoadingOverlay 
        isVisible={deleteFolderMutation.isPending}
        message={deletingFolder ? `Deleting folder "${deletingFolder.name}"...` : 'Deleting folder...'}
      />
        </div>
      </div>
    </div>
  );
}
