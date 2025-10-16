import Link from 'next/link';

export default function MediaHelp() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Media Library</h2>
      <p>Upload, organize, and manage all your images, videos, and other media files.</p>
      <p>
        <Link href="/admin/media" className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">
          Go to Media Library →
        </Link>
      </p>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Uploading Media</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Click "Upload Media" or drag and drop files directly</li>
          <li>Supported formats: Images (jpg, png, gif, webp), Videos, PDFs, and more</li>
          <li>Multiple files can be uploaded at once</li>
          <li>Images are automatically resized to configured sizes</li>
        </ul>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Folder Organization</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Create Folders:</strong> Organize media into hierarchical folder structures</li>
          <li><strong>Move Files:</strong> Drag and drop files between folders or use bulk actions</li>
          <li><strong>Breadcrumb Navigation:</strong> Click breadcrumbs to navigate up the folder hierarchy</li>
          <li><strong>File Count Badges:</strong> See how many files are in each folder at a glance</li>
          <li><strong>Nested Folders:</strong> Create subfolders within folders for detailed organization</li>
        </ul>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Editing Media</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Title:</strong> Descriptive name for the file</li>
          <li><strong>Alt Text:</strong> Important for SEO and accessibility</li>
          <li><strong>Caption:</strong> Optional text displayed with the image</li>
          <li><strong>Description:</strong> Detailed information about the media</li>
          <li><strong>Image Cropping:</strong> Create custom crops for different sizes</li>
        </ul>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Bulk Actions &amp; Trash</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Bulk Move:</strong> Select multiple files to move them to a different folder</li>
          <li><strong>Bulk Trash:</strong> Move multiple files to trash at once</li>
          <li><strong>Restore:</strong> Recover files from trash before permanent deletion</li>
          <li><strong>Permanent Delete:</strong> Remove files completely (cannot be undone)</li>
        </ul>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Image Sizes</h3>
        <p className="text-gray-700">
          Configure image sizes in <Link href="/admin/settings/media" className="text-primary-600 hover:text-primary-800 font-semibold underline">Settings &gt; Media</Link>. Define custom sizes with width, height, and crop settings.
          Images are automatically generated in all configured sizes upon upload. You can regenerate sizes for existing images
          if you change size settings later.
        </p>
      </div>
    </div>
  );
}

