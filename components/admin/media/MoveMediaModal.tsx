interface MoveMediaModalProps {
  isOpen: boolean;
  media: any;
  folders: any[];
  onClose: () => void;
  onMove: (folderId: number | null) => void;
}

export default function MoveMediaModal({
  isOpen,
  media,
  folders,
  onClose,
  onMove,
}: MoveMediaModalProps) {
  if (!isOpen || !media) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Move to Folder</h2>
        <p className="text-gray-600 mb-4">
          Moving: <span className="font-medium">{media.title || media.original_name}</span>
        </p>
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          <button
            onClick={() => onMove(null)}
            className="w-full text-left px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            📁 Root (Media Library)
          </button>
          {folders && folders.map((folder: any) => (
            <button
              key={folder.id}
              onClick={() => onMove(folder.id)}
              className="w-full text-left px-4 py-2 border border-gray-300 rounded-lg hover:bg-blue-50 transition-colors"
            >
              📁 {folder.name}
            </button>
          ))}
        </div>
        <div className="flex justify-end">
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

