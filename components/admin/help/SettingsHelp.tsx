import Link from 'next/link';

export default function SettingsHelp() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
      <p>Configure your site's global settings.</p>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <Link href="/admin/settings" className="group">
          <h3 className="font-semibold text-primary-600 mb-2 hover:text-primary-800 transition-colors inline-flex items-center gap-2 underline">
            General Settings
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </h3>
        </Link>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Site Name:</strong> Your website's name, used in titles and headers</li>
          <li><strong>Site Tagline:</strong> A short description or slogan</li>
          <li><strong>Site Description:</strong> Detailed description for SEO</li>
          <li><strong>Max Revisions:</strong> How many post revisions to keep (0 = disabled)</li>
          <li><strong>Session Timeout:</strong> How long users stay logged in</li>
        </ul>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <Link href="/admin/settings/media" className="group">
          <h3 className="font-semibold text-primary-600 mb-2 hover:text-primary-800 transition-colors inline-flex items-center gap-2 underline">
            Media Settings
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </h3>
        </Link>
        <p className="text-gray-700 mb-2">Configure image sizes and media handling:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Image Sizes:</strong> Define custom sizes with specific dimensions</li>
          <li><strong>Crop Settings:</strong> Choose whether to crop or resize proportionally</li>
          <li><strong>Quality:</strong> Set JPEG compression quality (higher = better quality, larger files)</li>
        </ul>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <Link href="/admin/settings/authentication" className="group">
          <h3 className="font-semibold text-primary-600 mb-2 hover:text-primary-800 transition-colors inline-flex items-center gap-2 underline">
            Authentication Settings
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </h3>
        </Link>
        <p className="text-gray-700 mb-2">Control password security for this site:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Password Requirements:</strong> Set minimum password length and complexity rules</li>
          <li><strong>Minimum Length:</strong> Require passwords to be at least a certain number of characters (default: 8)</li>
          <li><strong>Character Requirements:</strong> Enforce uppercase letters, lowercase letters, numbers, and special characters</li>
        </ul>
        <div className="mt-3 p-3 bg-white rounded border border-green-300">
          <p className="text-sm text-gray-700">
            <strong>Note:</strong> Password requirements are site-specific and apply when creating users or resetting passwords. For global system-wide settings (like hiding default credentials on the login page), Super Administrators can use the Global Settings page.
          </p>
        </div>
      </div>
    </div>
  );
}

