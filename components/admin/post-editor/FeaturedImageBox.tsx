'use client';

interface FeaturedImageBoxProps {
  readonly featuredImageUrl: string;
  readonly onSelectImage: () => void;
  readonly onRemoveImage: () => void;
}

export default function FeaturedImageBox({
  featuredImageUrl,
  onSelectImage,
  onRemoveImage,
}: FeaturedImageBoxProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Featured Image</h3>
      
      {featuredImageUrl ? (
        <div className="space-y-3">
          <img
            src={featuredImageUrl}
            alt="Featured"
            className="w-full h-48 object-cover rounded-lg"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSelectImage}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={onRemoveImage}
              className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSelectImage}
          className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors"
        >
          Select Image
        </button>
      )}
    </div>
  );
}

