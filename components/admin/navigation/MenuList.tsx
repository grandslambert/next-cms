'use client';

interface Menu {
  id: number;
  name: string;
  location: string;
  description?: string;
}

interface MenuListProps {
  menus: Menu[];
  selectedMenuId: number | null;
  onMenuSelect: (menuId: number) => void;
  onCreateNew: () => void;
}

export default function MenuList({
  menus,
  selectedMenuId,
  onMenuSelect,
  onCreateNew,
}: MenuListProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Your Menus</h2>
          <button
            onClick={onCreateNew}
            className="text-sm px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
          >
            + Add Menu
          </button>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-2">
          {menus.map((menu) => (
            <div
              key={menu.id}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                selectedMenuId === menu.id
                  ? 'bg-primary-50 border-2 border-primary-500'
                  : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
              }`}
              onClick={() => onMenuSelect(menu.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onMenuSelect(menu.id);
                }
              }}
            >
              <div>
                <h3 className="font-medium text-gray-900">{menu.name}</h3>
                <p className="text-xs text-gray-500">{menu.location}</p>
              </div>
            </div>
          ))}
          {menus.length === 0 && (
            <p className="text-gray-500 text-sm">No menus yet</p>
          )}
        </div>
      </div>
    </div>
  );
}


