import Link from 'next/link';

export default function UsersHelp() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Users &amp; Roles</h2>
      <p>Manage user accounts, roles, and permissions.</p>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <Link href="/admin/users" className="group">
          <h3 className="font-semibold text-primary-600 mb-2 hover:text-primary-800 transition-colors inline-flex items-center gap-2 underline">
            User Management
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </h3>
        </Link>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Create Users:</strong> Add new users with username, email, and password</li>
          <li><strong>Assign Roles:</strong> Control what users can do with role-based permissions</li>
          <li><strong>Edit Users:</strong> Update user information and change roles</li>
          <li><strong>Delete Users:</strong> Remove user accounts (cannot be undone)</li>
        </ul>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <Link href="/admin/users/roles" className="group">
          <h3 className="font-semibold text-primary-600 mb-2 hover:text-primary-800 transition-colors inline-flex items-center gap-2 underline">
            Roles &amp; Permissions
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </h3>
        </Link>
        <p className="text-gray-700 mb-2">Manage custom roles and permissions:</p>
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

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Username & Password Rules</h3>
        <p className="text-gray-700 mb-2">When creating or editing users:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Username Format:</strong> Only alphanumeric characters (a-z, A-Z, 0-9) and underscores (_) are allowed</li>
          <li><strong>Auto-Sanitization:</strong> Spaces are automatically converted to underscores while typing</li>
          <li><strong>Password Visibility:</strong> Click the eye icon (👁️) to show/hide passwords while typing</li>
          <li><strong>Generate Password:</strong> Use the dice icon (🎲) to generate a secure random password that follows all requirements</li>
          <li><strong>Real-time Validation:</strong> Password requirements show green checkmarks (✅) when met, red X marks (❌) when not met</li>
          <li><strong>Password Requirements:</strong> Configured in Settings → Authentication (min length, uppercase, lowercase, numbers, special characters)</li>
        </ul>
        <div className="mt-3 p-3 bg-white rounded border border-yellow-300">
          <p className="text-sm text-gray-700">
            <strong>Example:</strong> A username like "john doe" will automatically become "john_doe", and "user@name!" will become "username" (only valid characters kept).
          </p>
        </div>
      </div>
    </div>
  );
}

