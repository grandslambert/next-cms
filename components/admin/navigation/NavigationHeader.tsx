'use client';

interface NavigationHeaderProps {
  selectedMenuId: number | null;
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
    <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm px-8 py-4 mb-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Navigation Menus</h1>
          <p className="text-gray-600 text-sm mt-1">Manage your site navigation menus</p>
        </div>
        {selectedMenuId && (
          <div className="flex gap-3">
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Menu
            </button>
            <button
              onClick={onCancel}
              disabled={!hasAnyChanges}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={!hasAnyChanges}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update Menu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

