import { useEffect } from 'react';

interface FolderModalProps {
  isOpen: boolean;
  mode: 'create' | 'rename';
  folderName: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onNameChange: (name: string) => void;
}

export default function FolderModal({
  isOpen,
  mode,
  folderName,
  isPending,
  onClose,
  onSubmit,
  onNameChange,
}: FolderModalProps) {
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

  const title = mode === 'create' ? 'Create New Folder' : 'Rename Folder';
  const submitText = mode === 'create' ? 'Create Folder' : 'Rename';
  const submitingText = mode === 'create' ? 'Creating...' : 'Renaming...';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
        <input
          type="text"
          value={folderName}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onSubmit()}
          placeholder="Folder name"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
          autoFocus
        />
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isPending}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {isPending ? submitingText : submitText}
          </button>
        </div>
      </div>
    </div>
  );
}

