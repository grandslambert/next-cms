'use client';

interface MenuItem {
  id: number;
  parent_id: number | null;
  type: string;
  object_id: number | null;
  post_type?: string;
  custom_url?: string;
  custom_label?: string;
  target: string;
  menu_order: number;
  post_title?: string;
  post_type_label?: string;
  taxonomy_label?: string;
  term_name?: string;
  term_taxonomy_label?: string;
  title_attr?: string;
  css_classes?: string;
  xfn?: string;
  description?: string;
}

interface MenuItemsListProps {
  items: MenuItem[];
  isLoading: boolean;
  draggedItem: MenuItem | null;
  dropTarget: number | null;
  dragIndent: number;
  editingItemId: number | null;
  onDragStart: (e: React.DragEvent, item: MenuItem) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, dropIndex: number) => void;
  onDragEnd: () => void;
  onEdit: (itemId: number) => void;
  onDelete: (id: number) => void;
  onAddNew: () => void;
  onUpdateItem: (itemId: number, field: string, value: any) => void;
  postTypesData?: any;
}

export default function MenuItemsList({
  items,
  isLoading,
  draggedItem,
  dropTarget,
  dragIndent,
  editingItemId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onEdit,
  onDelete,
  onAddNew,
  onUpdateItem,
  postTypesData,
}: MenuItemsListProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Menu Items</h2>
          <button
            onClick={onAddNew}
            className="text-sm px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
          >
            + Add Item
          </button>
        </div>
        <p className="text-sm text-gray-600">
          💡 Drag items to reorder. While dragging, move right to indent as sub-item, or move left to make top-level.
        </p>
      </div>
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-1">
            {items.map((item, index) => {
              let displayLabel = item.custom_label;
              let displayType = item.type;
              
              if (!displayLabel) {
                if (item.type === 'post') {
                  displayLabel = item.post_title || `Post #${item.object_id}`;
                  const ptLabel = postTypesData?.postTypes?.find((pt: any) => pt.name === item.post_type)?.singular_label;
                  displayType = ptLabel || 'Post';
                } else if (item.type === 'post_type') {
                  displayLabel = item.post_type_label || `Post Type #${item.object_id}`;
                  displayType = 'Archive Page';
                } else if (item.type === 'taxonomy') {
                  displayLabel = item.taxonomy_label || `Taxonomy #${item.object_id}`;
                  displayType = 'Taxonomy Archive';
                } else if (item.type === 'term') {
                  displayLabel = item.term_name || `Term #${item.object_id}`;
                  displayType = item.term_taxonomy_label || 'Term';
                } else if (item.type === 'custom') {
                  displayLabel = item.custom_url;
                  displayType = 'Custom Link';
                }
              }

              const isChild = item.parent_id !== null && item.parent_id !== 0;
              const parentItem = isChild ? items.find((i) => i.id === item.parent_id) : null;
              const isEditing = editingItemId === item.id;
              const isDragging = draggedItem?.id === item.id;

              return (
                <div key={item.id}>
                  {/* Drop zone before this item */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      onDragOver(e, index);
                    }}
                    onDrop={(e) => onDrop(e, index)}
                    className={`transition-all ${
                      dropTarget === index && draggedItem
                        ? 'mb-1 opacity-100'
                        : 'h-4 opacity-0'
                    }`}
                  >
                    {dropTarget === index && draggedItem && (
                      <div className={`p-4 border-2 border-dashed border-primary-500 bg-primary-50 rounded-lg flex items-center justify-center ${
                        dragIndent === 1 ? 'ml-8' : ''
                      }`}>
                        <span className="text-sm text-primary-600 font-medium">
                          Drop here {dragIndent === 1 ? '(as sub-item)' : '(top-level)'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Menu Item */}
                  <div
                    className={`rounded-lg transition-all ${
                      isChild ? 'ml-8 border-l-4 border-primary-300' : ''
                    } ${
                      isEditing
                        ? 'bg-primary-50 border-2 border-primary-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    } ${
                      isDragging ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Collapsed View */}
                    <div
                      draggable={!isEditing}
                      onDragStart={(e) => onDragStart(e, item)}
                      onDragEnd={onDragEnd}
                      className={`p-4 ${!isEditing ? 'cursor-move' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Drag Handle */}
                        {!isEditing && (
                          <div className="text-gray-400 mt-1 cursor-grab active:cursor-grabbing">
                            ⋮⋮
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{displayLabel}</p>
                          <p className="text-sm text-gray-500">
                            {displayType}
                            {item.custom_url && item.type === 'custom' && ` • ${item.custom_url}`}
                            {item.target === '_blank' && ' • Opens in new window'}
                            {parentItem && ` • Child of "${parentItem.custom_label || 'Item'}"`}
                          </p>
                        </div>

                        {/* Expand/Collapse Arrow */}
                        <button
                          onClick={() => onEdit(isEditing ? 0 : item.id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {isEditing ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Edit View */}
                    {isEditing && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-4 mt-2">
                        {/* Item type info */}
                        <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded inline-block">
                          {item.type === 'post' && item.post_title && `Post: ${item.post_title}`}
                          {item.type === 'post_type' && item.post_type_label && `Post Type Archive: ${item.post_type_label}`}
                          {item.type === 'taxonomy' && item.taxonomy_label && `Taxonomy Archive: ${item.taxonomy_label}`}
                          {item.type === 'term' && item.term_name && `${item.term_taxonomy_label || 'Term'}: ${item.term_name}`}
                          {item.type === 'custom' && 'Custom Link'}
                        </div>

                        {/* Custom Label */}
                        <div>
                          <label htmlFor={`label-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Label
                          </label>
                          <input
                            id={`label-${item.id}`}
                            type="text"
                            value={item.custom_label || ''}
                            onChange={(e) => onUpdateItem(item.id, 'custom_label', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder={displayLabel}
                          />
                          <p className="text-xs text-gray-500 mt-1">Leave empty to use default label</p>
                        </div>

                        {/* URL (only for custom links) */}
                        {item.type === 'custom' && (
                          <div>
                            <label htmlFor={`url-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                              URL
                            </label>
                            <input
                              id={`url-${item.id}`}
                              type="text"
                              value={item.custom_url || ''}
                              onChange={(e) => onUpdateItem(item.id, 'custom_url', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="/about, https://example.com"
                            />
                          </div>
                        )}

                        {/* Link Target */}
                        <div>
                          <label htmlFor={`target-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Link Target
                          </label>
                          <select
                            id={`target-${item.id}`}
                            value={item.target}
                            onChange={(e) => onUpdateItem(item.id, 'target', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="_self">Same Window</option>
                            <option value="_blank">New Window</option>
                          </select>
                        </div>

                        {/* Advanced Fields */}
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-700 mb-3">Advanced</p>
                          
                          <div className="space-y-3">
                            <div>
                              <label htmlFor={`title-attr-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                                Title Attribute
                              </label>
                              <input
                                id={`title-attr-${item.id}`}
                                type="text"
                                value={item.title_attr || ''}
                                onChange={(e) => onUpdateItem(item.id, 'title_attr', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Tooltip text on hover"
                              />
                            </div>

                            <div>
                              <label htmlFor={`css-classes-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                                CSS Classes
                              </label>
                              <input
                                id={`css-classes-${item.id}`}
                                type="text"
                                value={item.css_classes || ''}
                                onChange={(e) => onUpdateItem(item.id, 'css_classes', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="class-name another-class"
                              />
                            </div>

                            <div>
                              <label htmlFor={`xfn-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                                Link Relationship (XFN)
                              </label>
                              <input
                                id={`xfn-${item.id}`}
                                type="text"
                                value={item.xfn || ''}
                                onChange={(e) => onUpdateItem(item.id, 'xfn', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="nofollow, friend, etc."
                              />
                            </div>

                            <div>
                              <label htmlFor={`description-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                              </label>
                              <textarea
                                id={`description-${item.id}`}
                                value={item.description || ''}
                                onChange={(e) => onUpdateItem(item.id, 'description', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Description for this menu item"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Delete Button */}
                        <div className="flex justify-end pt-3 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Delete this menu item?')) {
                                onDelete(item.id);
                              }
                            }}
                            className="text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Delete Item
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Drop zone after last item */}
                  {index === items.length - 1 && (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        onDragOver(e, items.length);
                      }}
                      onDrop={(e) => onDrop(e, items.length)}
                      className={`transition-all ${
                        dropTarget === items.length && draggedItem
                          ? 'mt-1 opacity-100'
                          : 'h-4 opacity-0'
                      }`}
                    >
                      {dropTarget === items.length && draggedItem && (
                        <div className={`p-4 border-2 border-dashed border-primary-500 bg-primary-50 rounded-lg flex items-center justify-center ${
                          dragIndent === 1 ? 'ml-8' : ''
                        }`}>
                          <span className="text-sm text-primary-600 font-medium">
                            Drop here {dragIndent === 1 ? '(as sub-item)' : '(top-level)'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No menu items yet</p>
            <p className="text-sm mt-2">Click "Add Item" to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
