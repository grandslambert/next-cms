'use client';

interface SeoMetadataBoxProps {
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly seoKeywords: string;
  readonly onSeoTitleChange: (value: string) => void;
  readonly onSeoDescriptionChange: (value: string) => void;
  readonly onSeoKeywordsChange: (value: string) => void;
}

export default function SeoMetadataBox({
  seoTitle,
  seoDescription,
  seoKeywords,
  onSeoTitleChange,
  onSeoDescriptionChange,
  onSeoKeywordsChange,
}: SeoMetadataBoxProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="font-semibold text-gray-900 mb-4">SEO Metadata</h3>
      
      <div className="space-y-4">
        {/* SEO Title */}
        <div>
          <label htmlFor="seo-title" className="block text-sm font-medium text-gray-700 mb-2">
            SEO Title
          </label>
          <input
            id="seo-title"
            type="text"
            value={seoTitle}
            onChange={(e) => onSeoTitleChange(e.target.value)}
            maxLength={60}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Leave empty to use post title"
          />
          <p className="text-xs text-gray-500 mt-1">
            {seoTitle.length}/60 characters - Optimal: 50-60 characters
          </p>
        </div>

        {/* SEO Description */}
        <div>
          <label htmlFor="seo-description" className="block text-sm font-medium text-gray-700 mb-2">
            SEO Description
          </label>
          <textarea
            id="seo-description"
            value={seoDescription}
            onChange={(e) => onSeoDescriptionChange(e.target.value)}
            maxLength={160}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Leave empty to use post excerpt"
          />
          <p className="text-xs text-gray-500 mt-1">
            {seoDescription.length}/160 characters - Optimal: 150-160 characters
          </p>
        </div>

        {/* SEO Keywords */}
        <div>
          <label htmlFor="seo-keywords" className="block text-sm font-medium text-gray-700 mb-2">
            SEO Keywords
          </label>
          <input
            id="seo-keywords"
            type="text"
            value={seoKeywords}
            onChange={(e) => onSeoKeywordsChange(e.target.value)}
            maxLength={500}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="keyword1, keyword2, keyword3"
          />
          <p className="text-xs text-gray-500 mt-1">
            Comma-separated keywords relevant to this content
          </p>
        </div>
      </div>
      
      <p className="mt-4 text-xs text-gray-500">
        SEO metadata helps search engines understand your content better
      </p>
    </div>
  );
}

