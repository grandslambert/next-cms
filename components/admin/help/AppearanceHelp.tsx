import Link from 'next/link';

export default function AppearanceHelp() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Appearance</h2>
      <p>Control how your site looks and how visitors navigate it.</p>
      <div className="flex gap-3">
        <Link href="/admin/navigation" className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">
          Manage Menus →
        </Link>
        <Link href="/admin/settings/menus" className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">
          Menu Locations →
        </Link>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Creating Menus</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Go to <Link href="/admin/navigation" className="text-primary-600 hover:text-primary-800 font-semibold underline">Appearance &gt; Menus</Link></li>
          <li>Create a new menu with a descriptive name</li>
          <li>Assign the menu to a location (Header, Footer, or Sidebar)</li>
          <li>Add items to your menu from different sources</li>
        </ul>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Menu Item Types</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Post Type / Page:</strong> Link to specific posts or post type archives</li>
          <li><strong>Taxonomy Archive:</strong> Link to category or tag archive pages</li>
          <li><strong>Custom Link:</strong> Link to any URL (internal or external)</li>
        </ul>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Organizing Menu Items</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Drag &amp; Drop:</strong> Reorder items by dragging them up or down</li>
          <li><strong>Create Submenus:</strong> Drag items left or right to create parent/child relationships</li>
          <li><strong>Edit Items:</strong> Click the arrow to expand and edit navigation label, title attribute, CSS classes, and more</li>
          <li><strong>Batch Saving:</strong> Changes are held until you click "Update Menu"</li>
        </ul>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Menu Locations</h3>
        <p className="text-gray-700">
          Manage menu locations in <Link href="/admin/settings/menus" className="text-primary-600 hover:text-primary-800 font-semibold underline">Appearance &gt; Menu Locations</Link>. Built-in locations (Header, Footer, Sidebar)
          cannot be deleted. You can create custom locations for theme flexibility.
        </p>
      </div>
    </div>
  );
}

