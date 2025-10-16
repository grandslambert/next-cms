import Link from 'next/link';

export default function ToolsHelp() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Tools</h1>
      <p className="text-gray-600 mb-8">
        Administrative tools for managing your CMS data, monitoring activity, and maintaining your site.
      </p>

      {/* Import/Export */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 flex items-center">
          <span className="text-3xl mr-3">📦</span>
          <Link href="/admin/tools/import-export" className="group text-primary-600 hover:text-primary-800 transition-colors underline inline-flex items-center gap-2">
            Import/Export
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </Link>
        </h2>
        
        <div className="space-y-4">
          <p>
            The Import/Export tool allows you to backup your site data and migrate content between installations.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">💡 What You Can Export</h3>
            <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
              <li><strong>Posts & Pages</strong> - All content including custom post types and meta data</li>
              <li><strong>Media Library</strong> - File metadata and folder structure (actual files must be copied manually)</li>
              <li><strong>Taxonomies</strong> - Taxonomy definitions, terms, and post-term relationships</li>
              <li><strong>Navigation Menus</strong> - Menu structures, items, meta fields, and locations</li>
              <li><strong>Post Types</strong> - Custom post type definitions and settings</li>
              <li><strong>Settings</strong> - Site configuration and preferences</li>
              <li><strong>Users & Roles</strong> - User accounts and permissions (passwords excluded for security)</li>
            </ul>
          </div>

          <h3 className="font-semibold mt-6 mb-2">Exporting Data</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Navigate to <strong>Tools → Import/Export</strong></li>
            <li>Select the data types you want to export using the checkboxes</li>
            <li>Use "Select All" or "Select None" for quick selection</li>
            <li>Click "Export Selected Data" to download a JSON file</li>
            <li>The file will be named with a timestamp: <code className="bg-gray-100 px-1 text-sm">nextcms-export-YYYY-MM-DD.json</code></li>
          </ol>

          <h3 className="font-semibold mt-6 mb-2">Importing Data</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Navigate to <strong>Tools → Import/Export</strong></li>
            <li>Click "Choose a file" or drag and drop a JSON export file</li>
            <li>Review the import notes and warnings</li>
            <li>Click "Import Data" to begin the import process</li>
            <li>A summary will show how many items were imported in each category</li>
          </ol>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
            <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Important Notes</h3>
            <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
              <li><strong>Backup First:</strong> Always create a database backup before importing</li>
              <li><strong>Media Files:</strong> Only metadata is exported. Copy actual files manually from the <code className="bg-yellow-100 px-1">uploads/</code> directory</li>
              <li><strong>Passwords:</strong> User passwords are never exported or imported (users must reset passwords)</li>
              <li><strong>Duplicates:</strong> Import automatically prevents duplicates based on unique identifiers (slug, email, name)</li>
              <li><strong>IDs May Change:</strong> Imported content may have different database IDs than the original</li>
              <li><strong>Foreign Keys:</strong> Import validates and handles missing references gracefully (e.g., missing authors default to admin)</li>
            </ul>
          </div>

        </div>
      </section>

      {/* Activity Log */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 flex items-center">
          <span className="text-3xl mr-3">📋</span>
          <Link href="/admin/activity-log" className="group text-primary-600 hover:text-primary-800 transition-colors underline inline-flex items-center gap-2">
            Activity Log
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </Link>
        </h2>
        
        <div className="space-y-4">
          <p>
            The Activity Log provides a comprehensive audit trail of all actions taken in your CMS, helping you track changes and maintain accountability.
          </p>

          <h3 className="font-semibold mt-6 mb-2">What's Logged</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Post and page creation, updates, and deletions</li>
            <li>User account changes and role assignments</li>
            <li>Media uploads and deletions</li>
            <li>Taxonomy and term modifications</li>
            <li>Settings updates</li>
            <li>Menu changes</li>
            <li>Post type configurations</li>
          </ul>

          <h3 className="font-semibold mt-6 mb-2">Using the Activity Log</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li><strong>Filter by User:</strong> See actions by specific users</li>
            <li><strong>Filter by Action Type:</strong> Focus on specific operations (created, updated, deleted)</li>
            <li><strong>Filter by Entity:</strong> View changes to specific content types</li>
            <li><strong>Search:</strong> Find specific entries by entity name or details</li>
            <li><strong>View Changes:</strong> Click "View Details" to see before/after comparisons for updates</li>
          </ul>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> Activity logs are invaluable for debugging issues, auditing changes, and maintaining security. Review them regularly to monitor site activity.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

