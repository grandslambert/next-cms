'use client';

interface MenuFormProps {
  mode: 'create' | 'edit';
  formData: {
    name: string;
    location: string;
    description: string;
  };
  isPending: boolean;
  locations: any[];
  onChange: (field: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function MenuForm({
  mode,
  formData,
  isPending,
  locations,
  onChange,
  onSubmit,
  onCancel,
  onDelete,
}: MenuFormProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      {mode === 'create' ? (
        <>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Menu</h3>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="menu-name" className="block text-sm font-medium text-gray-700 mb-2">
                Menu Name *
              </label>
              <input
                id="menu-name"
                type="text"
                value={formData.name}
                onChange={(e) => onChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Primary Menu"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <div className="space-y-2">
                {locations.map((loc: any) => (
                  <label
                    key={loc.id}
                    className="flex items-start p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="menu-location"
                      value={loc.name}
                      checked={formData.location === loc.name}
                      onChange={(e) => onChange('location', e.target.value)}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      required
                    />
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{loc.name}</p>
                      {loc.description && (
                        <p className="text-sm text-gray-500">{loc.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Manage locations in Settings → Menu Locations
              </p>
            </div>
            <div>
              <label htmlFor="menu-description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="menu-description"
                value={formData.description}
                onChange={(e) => onChange('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Optional description"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                Create Menu
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Menu Settings</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-menu-name" className="block text-sm font-medium text-gray-700 mb-2">
                Menu Name *
              </label>
              <input
                id="edit-menu-name"
                type="text"
                value={formData.name}
                onChange={(e) => onChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Primary Menu"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <div className="space-y-2">
                {locations.map((loc: any) => (
                  <label
                    key={loc.id}
                    className="flex items-start p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="edit-menu-location"
                      value={loc.name}
                      checked={formData.location === loc.name}
                      onChange={(e) => onChange('location', e.target.value)}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{loc.name}</p>
                      {loc.description && (
                        <p className="text-sm text-gray-500">{loc.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Manage locations in Settings → Menu Locations
              </p>
            </div>
            <div>
              <label htmlFor="edit-menu-description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="edit-menu-description"
                value={formData.description}
                onChange={(e) => onChange('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Optional description"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

