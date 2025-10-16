import { formatDate } from '@/lib/utils';

interface EditMediaModalProps {
  isOpen: boolean;
  media: any;
  title: string;
  altText: string;
  isPending: boolean;
  isRegenerating: boolean;
  onClose: () => void;
  onSave: () => void;
  onTitleChange: (title: string) => void;
  onAltTextChange: (altText: string) => void;
  onCopyUrl: (url: string) => void;
  onRegenerate?: () => void;
}

export default function EditMediaModal({
  isOpen,
  media,
  title,
  altText,
  isPending,
  isRegenerating,
  onClose,
  onSave,
  onTitleChange,
  onAltTextChange,
  onCopyUrl,
  onRegenerate,
}: EditMediaModalProps) {
  if (!isOpen || !media) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Media Details</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Preview */}
          <div className="flex justify-center">
            {media.mime_type.startsWith('image/') ? (
              <img
                src={media.url}
                alt={media.title || media.original_name}
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
            <p className="text-sm text-gray-600">{media.original_name}</p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter a descriptive title"
            />
            <p className="mt-1 text-xs text-gray-500">
              This will be displayed in the media library
            </p>
          </div>

          {/* Alt Text */}
          {media.mime_type.startsWith('image/') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alt Text
              </label>
              <input
                type="text"
                value={altText}
                onChange={(e) => onAltTextChange(e.target.value)}
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
                {(media.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Type</p>
              <p className="text-sm font-medium text-gray-900">
                {media.mime_type}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Uploaded</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(media.created_at)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">URL</p>
              <button
                onClick={() => onCopyUrl(media.url)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Copy URL 📋
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <div>
            {media.mime_type.startsWith('image/') && onRegenerate && (
              <button
                onClick={onRegenerate}
                disabled={isRegenerating || isPending}
                className="px-4 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50"
                title="Regenerate all size variants for this image"
              >
                {isRegenerating ? '⏳ Regenerating...' : '🔄 Regenerate Sizes'}
              </button>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={isPending || isRegenerating}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

