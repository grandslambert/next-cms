export default function TipsHelp() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Tips &amp; Best Practices</h2>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Content Management</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Always add alt text to images for SEO and accessibility</li>
          <li>Use descriptive slugs that reflect your content</li>
          <li>Organize content with categories and tags for better discoverability</li>
          <li>Save drafts frequently - revisions are your safety net</li>
          <li>Use featured images to make your content more engaging</li>
        </ul>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Performance</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Optimize images before uploading (compress large files)</li>
          <li>Use appropriate image sizes for different contexts</li>
          <li>Limit the number of revisions to save database space</li>
          <li>Regularly review and remove unused media files</li>
        </ul>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Security</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Use strong passwords for all user accounts</li>
          <li>Grant users only the permissions they need</li>
          <li>Review the Activity Log regularly for suspicious activity</li>
          <li>Keep the session timeout reasonable (not too long)</li>
          <li>Be careful when assigning Administrator role</li>
        </ul>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Organization</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Use consistent naming conventions for post types and taxonomies</li>
          <li>Create a logical menu structure for easy navigation</li>
          <li>Group related settings and post types together</li>
          <li>Document custom post types and taxonomies for your team</li>
        </ul>
      </div>
    </div>
  );
}

