import Link from 'next/link';

export default function DashboardHelp() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
      <p>The Dashboard provides an overview of your site's content and activity. What you see depends on your user role and permissions.</p>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <Link href="/admin" className="group">
          <h3 className="font-semibold text-primary-600 mb-2 hover:text-primary-800 transition-colors inline-flex items-center gap-2 underline">
            Content Summary
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </h3>
        </Link>
        <p className="text-gray-700 mb-2">
          The Content Summary section displays clickable tiles showing the total count for each content type you have access to:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Post Types:</strong> Shows all post types (posts, pages, and custom types) with their icons and total counts</li>
          <li><strong>Taxonomies:</strong> Displays categories, tags, and custom taxonomies with their term counts</li>
          <li><strong>Media:</strong> Total number of uploaded files in the media library</li>
          <li><strong>Users:</strong> Total registered users (visible to administrators only)</li>
        </ul>
        <p className="text-gray-700 mt-2">
          <strong>Note:</strong> Only content types marked as "Show in Dashboard" will appear here, and only if you have the appropriate permissions.
        </p>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Quick Stats</h3>
        <p className="text-gray-700 mb-2">The Quick Stats panel shows at-a-glance information about your content:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Published Posts:</strong> Total number of published posts across all post types</li>
          <li><strong>Draft Posts:</strong> Total number of draft posts waiting to be completed</li>
          <li><strong>Your Role:</strong> Displays your current role (Administrator, Editor, Author, etc.)</li>
        </ul>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Recent Content</h3>
        <p className="text-gray-700 mb-2">
          The Recent Content section shows the 8 most recently created posts from all post types you can access:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Each post shows its <strong>post type</strong> and <strong>status</strong> (Published, Draft, Pending, Scheduled)</li>
          <li>Displays the <strong>title</strong>, <strong>author</strong>, and <strong>creation date</strong></li>
          <li>Click any post title to edit it directly</li>
          <li>Posts are sorted by creation date, with newest at the top</li>
        </ul>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Recent Media</h3>
        <p className="text-gray-700">
          The Recent Media section displays a grid of the 12 most recently uploaded media files. Images show thumbnails, 
          while other file types display an icon. This gives you quick visual access to your latest uploads.
        </p>
      </div>
    </div>
  );
}

