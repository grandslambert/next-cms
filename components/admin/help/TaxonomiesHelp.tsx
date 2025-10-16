import Link from 'next/link';

export default function TaxonomiesHelp() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Taxonomies</h2>
      <p>Organize your content with categories, tags, and custom taxonomies.</p>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Hierarchical vs Non-Hierarchical</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Hierarchical (Categories):</strong> Can have parent/child relationships, like folders</li>
          <li><strong>Non-Hierarchical (Tags):</strong> Flat structure, like keywords</li>
        </ul>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <Link href="/admin/content-types/taxonomies" className="group">
          <h3 className="font-semibold text-primary-600 mb-2 hover:text-primary-800 transition-colors inline-flex items-center gap-2 underline">
            Creating Custom Taxonomies
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </h3>
        </Link>
        <p className="text-gray-700 mb-2">Create custom ways to organize content:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Name:</strong> Machine-readable identifier (e.g., "genre", "location")</li>
          <li><strong>Label:</strong> Display name (e.g., "Genres", "Locations")</li>
          <li><strong>Hierarchical:</strong> Choose structure type</li>
          <li><strong>Post Types:</strong> Select which post types can use this taxonomy</li>
        </ul>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Managing Terms</h3>
        <p className="text-gray-700">
          Click on a taxonomy in the sidebar to manage its terms. You can add, edit, delete, and reorder terms.
          For hierarchical taxonomies, drag items to change their parent relationship.
        </p>
      </div>
    </div>
  );
}

