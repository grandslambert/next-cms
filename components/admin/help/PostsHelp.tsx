import Link from 'next/link';

export default function PostsHelp() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Posts &amp; Custom Post Types</h2>
      <p>Manage all your content including blog posts and custom post types.</p>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Creating &amp; Editing Posts</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Title:</strong> Enter your post title</li>
          <li><strong>Slug:</strong> Auto-generated URL-friendly version of the title (can be customized)</li>
          <li><strong>Content:</strong> Write your post content using the rich text editor</li>
          <li><strong>Excerpt:</strong> Optional short summary of your post</li>
          <li><strong>Status:</strong> Draft, Pending Review, or Published</li>
          <li><strong>Featured Image:</strong> Select a main image for your post from the media library</li>
        </ul>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Custom Post Types</h3>
        <p className="text-gray-700 mb-2">Create specialized content types beyond standard posts:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Name:</strong> Machine-readable identifier (e.g., "product", "portfolio")</li>
          <li><strong>Label:</strong> Human-readable name (e.g., "Products", "Portfolio Items")</li>
          <li><strong>Hierarchical:</strong> Enable parent/child relationships like pages</li>
          <li><strong>Supports:</strong> Choose features (title, editor, excerpt, featured image, comments)</li>
          <li><strong>Menu Position:</strong> Control where it appears in the sidebar</li>
        </ul>
        <p className="text-gray-700 mt-2">
          Go to <Link href="/admin/content-types/post-types" className="text-primary-600 hover:text-primary-800 font-semibold underline">Content Types &gt; Post Types</Link> to create and manage custom post types.
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Custom Fields (Post Meta)</h3>
        <p className="text-gray-700 mb-2">
          Add unlimited custom data to any post using key-value pairs. Custom fields are perfect for storing additional information 
          that doesn't fit in standard fields:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Key:</strong> The field name (e.g., "price", "author_bio", "event_date")</li>
          <li><strong>Value:</strong> The data stored in that field</li>
          <li><strong>Add/Edit/Delete:</strong> Manage custom fields in the "Custom Fields" section when editing a post</li>
          <li><strong>Use Cases:</strong> Product prices, event dates, external URLs, ratings, custom metadata</li>
        </ul>
        <p className="text-gray-700 mt-2">
          <strong>Tip:</strong> Custom fields are stored in the database as post meta and can be accessed programmatically 
          in your templates for custom functionality.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Revisions &amp; Autosave</h3>
        <p className="text-gray-700 mb-2">
          Your content is automatically protected with revisions and autosave:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Autosave:</strong> Drafts are automatically saved every 3 seconds while you type</li>
          <li><strong>Visual Diff:</strong> Compare current content with autosaved version side-by-side</li>
          <li><strong>Revisions History:</strong> Click "View Revisions" to see all saved versions</li>
          <li><strong>Restore:</strong> One-click restore to any previous version</li>
          <li><strong>Revision Limit:</strong> Control how many revisions to keep in <Link href="/admin/settings" className="text-primary-600 hover:text-primary-800 font-semibold underline">Settings &gt; General</Link></li>
        </ul>
      </div>
    </div>
  );
}

