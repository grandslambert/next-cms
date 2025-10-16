import { useState } from 'react';

interface MediaGridProps {
  folders: any[];
  media: any[];
  isLoading: boolean;
  showTrash: boolean;
  selectedMedia: number[];
  onOpenFolder: (folder: any) => void;
  onEditFolder: (folder: any) => void;
  onDeleteFolder: (folder: any) => void;
  onEditMedia: (item: any) => void;
  onMoveMedia: (item: any) => void;
  onCopyUrl: (url: string) => void;
  onDeleteMedia: (id: number, name: string) => void;
  onDropMedia: (mediaId: number, folderId: number | null) => void;
  onSelectMedia: (id: number) => void;
  onSelectAll: () => void;
  onRestoreMedia?: (id: number, name: string) => void;
  onPermanentDelete?: (id: number, name: string) => void;
}

export default function MediaGrid({
  folders,
  media,
  isLoading,
  showTrash,
  selectedMedia,
  onOpenFolder,
  onEditFolder,
  onDeleteFolder,
  onEditMedia,
  onMoveMedia,
  onCopyUrl,
  onDeleteMedia,
  onDropMedia,
  onSelectMedia,
  onSelectAll,
  onRestoreMedia,
  onPermanentDelete,
}: Readonly<MediaGridProps>) {
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const allMediaSelected = media && media.length > 0 && selectedMedia.length === media.length;
  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  const hasContent = (folders && folders.length > 0) || (media && media.length > 0);

  if (!hasContent) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="text-6xl mb-4">🖼️</div>
        <p className="text-lg">No media files yet</p>
        <p className="text-sm mt-2">Click the "Upload Files" button to get started</p>
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent, mediaId: number) => {
    setDraggedItem(mediaId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', mediaId.toString());
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, folderId: number | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(folderId);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, folderId: number | null) => {
    e.preventDefault();
    if (draggedItem !== null) {
      onDropMedia(draggedItem, folderId);
    }
    setDraggedItem(null);
    setDropTarget(null);
  };

  return (
    <div>
      {/* Select All Checkbox */}
      {media && media.length > 0 && (
        <div className="mb-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allMediaSelected}
              onChange={onSelectAll}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">
              Select All ({media.length} items)
            </span>
          </label>
        </div>
      )}

      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
      {/* Folders */}
      {folders && folders.map((folder: any) => (
        <div 
          key={`folder-${folder.id}`} 
          className={`group relative bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
            dropTarget === folder.id 
              ? 'border-blue-600 shadow-lg scale-105' 
              : 'border-blue-200 hover:border-blue-400'
          }`}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
        >
          <button 
            onClick={() => onOpenFolder(folder)}
            className="aspect-square flex flex-col items-center justify-center p-4 w-full"
          >
            <div className={`text-5xl mb-1 transition-transform ${dropTarget === folder.id ? 'scale-125' : ''}`}>
              {dropTarget === folder.id ? '📂' : '📁'}
            </div>
            <span className="text-xs font-medium text-gray-900 text-center truncate w-full px-1">
              {folder.name}
            </span>
            <span className="text-xs text-gray-600 mt-1">
              {folder.file_count || 0} {folder.file_count === 1 ? 'file' : 'files'}
              {folder.subfolder_count > 0 && `, ${folder.subfolder_count} ${folder.subfolder_count === 1 ? 'folder' : 'folders'}`}
            </span>
          </button>
          
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditFolder(folder);
                }}
                className="px-2 py-1 bg-white text-gray-700 rounded shadow-sm hover:bg-gray-100 text-xs"
                title="Rename"
              >
                ✏️
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder(folder);
                }}
                className="px-2 py-1 bg-white text-red-600 rounded shadow-sm hover:bg-red-50 text-xs"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Media Files */}
      {media && media.map((item: any) => (
        <div 
          key={item.id} 
          className={`group relative bg-gray-100 rounded-lg overflow-hidden ${
            draggedItem === item.id ? 'opacity-50' : ''
          } ${selectedMedia.includes(item.id) ? 'ring-2 ring-primary-600' : ''} ${
            !showTrash ? 'cursor-move' : ''
          }`}
          draggable={!showTrash}
          onDragStart={(e) => !showTrash && handleDragStart(e, item.id)}
          onDragEnd={handleDragEnd}
        >
          {/* Selection Checkbox */}
          <div className="absolute top-2 left-2 z-10">
            <input
              type="checkbox"
              checked={selectedMedia.includes(item.id)}
              onChange={() => onSelectMedia(item.id)}
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
              {!showTrash ? (
                <>
                  <button
                    onClick={() => onEditMedia(item)}
                    className="px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm"
                    title="Edit Details"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => onMoveMedia(item)}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    title="Move to Folder"
                  >
                    📁
                  </button>
                  <button
                    onClick={() => onCopyUrl(item.url)}
                    className="px-3 py-2 bg-white text-gray-900 rounded hover:bg-gray-100 text-sm"
                    title="Copy URL"
                  >
                    📋
                  </button>
                  <button
                    onClick={() => onDeleteMedia(item.id, item.original_name)}
                    className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    title="Move to Trash"
                  >
                    🗑️
                  </button>
                </>
              ) : (
                <>
                  {onRestoreMedia && (
                    <button
                      onClick={() => onRestoreMedia(item.id, item.original_name)}
                      className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      title="Restore"
                    >
                      ↩️ Restore
                    </button>
                  )}
                  {onPermanentDelete && (
                    <button
                      onClick={() => onPermanentDelete(item.id, item.original_name)}
                      className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      title="Delete Permanently"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </>
              )}
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
    </div>
  );
}

