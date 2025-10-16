import Link from 'next/link';

export default function UsersHelp() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Users &amp; Roles</h2>
      <p>Manage user accounts, roles, and permissions.</p>
      <div className="flex gap-3">
        <Link href="/admin/users" className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">
          Manage Users →
        </Link>
        <Link href="/admin/users/roles" className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">
          Manage Roles →
        </Link>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">User Management</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Create Users:</strong> Add new users with username, email, and password</li>
          <li><strong>Assign Roles:</strong> Control what users can do with role-based permissions</li>
          <li><strong>Edit Users:</strong> Update user information and change roles</li>
          <li><strong>Delete Users:</strong> Remove user accounts (cannot be undone)</li>
        </ul>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Roles &amp; Permissions</h3>
        <p className="text-gray-700 mb-2">Go to <Link href="/admin/users/roles" className="text-primary-600 hover:text-primary-800 font-semibold underline">Users &gt; Roles</Link> to manage roles:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Administrator:</strong> Full access to all features (built-in, cannot be deleted)</li>
          <li><strong>Editor:</strong> Can manage all content but not users or settings</li>
          <li><strong>Author:</strong> Can create and publish their own posts</li>
          <li><strong>Contributor:</strong> Can create posts but cannot publish them</li>
          <li><strong>Custom Roles:</strong> Create roles with specific permission combinations</li>
        </ul>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Permission Types</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>View Dashboard, Manage Posts, Manage Media, Manage Comments</li>
          <li>Manage Users, Manage Roles, Manage Taxonomies, Manage Settings</li>
          <li>Manage Post Types, Manage Menus, and more</li>
        </ul>
      </div>
    </div>
  );
}

