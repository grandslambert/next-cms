import Link from 'next/link';

export default function SettingsHelp() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
      <p>Configure your site's global settings.</p>
      <div className="flex gap-3">
        <Link href="/admin/settings" className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">
          General Settings →
        </Link>
        <Link href="/admin/settings/media" className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">
          Media Settings →
        </Link>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">General Settings</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Site Name:</strong> Your website's name, used in titles and headers</li>
          <li><strong>Site Tagline:</strong> A short description or slogan</li>
          <li><strong>Site Description:</strong> Detailed description for SEO</li>
          <li><strong>Max Revisions:</strong> How many post revisions to keep (0 = disabled)</li>
          <li><strong>Session Timeout:</strong> How long users stay logged in</li>
        </ul>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Media Settings</h3>
        <p className="text-gray-700 mb-2">Configure image sizes and media handling:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Image Sizes:</strong> Define custom sizes with specific dimensions</li>
          <li><strong>Crop Settings:</strong> Choose whether to crop or resize proportionally</li>
          <li><strong>Quality:</strong> Set JPEG compression quality (higher = better quality, larger files)</li>
        </ul>
      </div>
    </div>
  );
}

