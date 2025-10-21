'use client';

interface NavigationHeaderProps {
  selectedMenuId: string | null;
  menuName: string;
  hasAnyChanges: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export default function NavigationHeader({
  selectedMenuId,
  menuName,
  hasAnyChanges,
  onSave,
  onCancel,
  onDelete,
}: NavigationHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Navigation Menus</h1>
        <p className="text-sm text-gray-600">Manage your site navigation menus</p>
      </div>
      {selectedMenuId && (
        <div className="flex space-x-2">
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete Menu
          </button>
          <button
            onClick={onCancel}
            disabled={!hasAnyChanges}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!hasAnyChanges}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Update Menu
          </button>
        </div>
      )}
    </div>
  );
}

