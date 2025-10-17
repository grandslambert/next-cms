import { useEffect } from 'react';

interface BulkMoveModalProps {
  readonly isOpen: boolean;
  readonly selectedCount: number;
  readonly folders: any[];
  readonly currentFolderId: number | null;
  readonly onClose: () => void;
  readonly onMove: (folderId: number | null) => void;
}

export default function BulkMoveModal({
  isOpen,
  selectedCount,
  folders,
  currentFolderId,
  onClose,
  onMove,
}: BulkMoveModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Move Selected Items</h2>
        <p className="text-gray-600 mb-4">
          Moving <span className="font-medium">{selectedCount}</span> selected {selectedCount === 1 ? 'item' : 'items'} to:
        </p>
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          <button
            onClick={() => onMove(null)}
            disabled={currentFolderId === null}
            className="w-full text-left px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📁 Root (Media Library) {currentFolderId === null && '(Current)'}
          </button>
          {folders?.map((folder: any) => (
            <button
              key={folder.id}
              onClick={() => onMove(folder.id)}
              disabled={folder.id === currentFolderId}
              className="w-full text-left px-4 py-2 border border-gray-300 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📁 {folder.display_name || folder.name} {folder.id === currentFolderId && '(Current)'}
            </button>
          ))}
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

