import Link from 'next/link';

export default function ActivityLogHelp() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Activity Log</h2>
      <p>Track all actions performed in your CMS for security and auditing.</p>
      <p>
        <Link href="/admin/activity-log" className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">
          View Activity Log →
        </Link>
      </p>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">What's Logged</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>User logins and authentication attempts</li>
          <li>Content creation, editing, and deletion</li>
          <li>Media uploads and modifications</li>
          <li>Settings changes</li>
          <li>User management actions</li>
          <li>Menu and navigation changes</li>
        </ul>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Activity Details</h3>
        <p className="text-gray-700 mb-2">Each activity entry includes:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Timestamp:</strong> Exact date and time of the action</li>
          <li><strong>User:</strong> Who performed the action</li>
          <li><strong>Action Type:</strong> What was done (create, update, delete, etc.)</li>
          <li><strong>Resource:</strong> What was affected (post, user, setting, etc.)</li>
          <li><strong>Details:</strong> Additional information like before/after values</li>
        </ul>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Filtering &amp; Search</h3>
        <p className="text-gray-700">
          Use filters to narrow down activities by user, action type, or date range. This helps you find specific
          events or audit user actions quickly.
        </p>
      </div>
    </div>
  );
}

