'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';
import NavigationHeader from '@/components/admin/navigation/NavigationHeader';
import MenuList from '@/components/admin/navigation/MenuList';
import MenuForm from '@/components/admin/navigation/MenuForm';
import MenuItemsList from '@/components/admin/navigation/MenuItemsList';
import AddMenuItemForm from '@/components/admin/navigation/AddMenuItemForm';

export default function NavigationPage() {
  const { isLoading: permissionLoading } = usePermission('manage_menus');
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [menuPreferenceLoaded, setMenuPreferenceLoaded] = useState(false);
  const [isCreatingMenu, setIsCreatingMenu] = useState(false);
  const [menuFormData, setMenuFormData] = useState({
    name: '',
    location: '',
    description: '',
  });
  const [hasMenuChanges, setHasMenuChanges] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [postTypeFilter, setPostTypeFilter] = useState('');
  const [postSearchQuery, setPostSearchQuery] = useState('');
  const [taxonomyFilter, setTaxonomyFilter] = useState<number | null>(null);
  const [termSearchQuery, setTermSearchQuery] = useState('');
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [dragIndent, setDragIndent] = useState(0);
  const [localMenuItems, setLocalMenuItems] = useState<any[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<number[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const queryClient = useQueryClient();

  // Fetch menus
  const { data: menusData, isLoading: menusLoading } = useQuery({
    queryKey: ['menus'],
    queryFn: async () => {
      const res = await axios.get('/api/menus');
      return res.data;
    },
  });

  // Fetch last selected menu from user preferences
  const { data: lastMenuData, isLoading: prefLoading } = useQuery({
    queryKey: ['user-meta', 'last_selected_menu'],
    queryFn: async () => {
      const res = await axios.get('/api/user/meta?key=last_selected_menu');
      return res.data;
    },
  });

  // Load last selected menu on page load
  useEffect(() => {
    // Wait for both queries to complete
    if (menuPreferenceLoaded || menusLoading || prefLoading) {
      return;
    }

    // Mark as loaded even if no menus exist
    setMenuPreferenceLoaded(true);

    if (menusData?.menus && menusData.menus.length > 0) {
      let menuIdToSelect = null;
      
      // Check if we have a saved preference
      if (lastMenuData?.meta_value) {
        const lastMenuId = Number.parseInt(lastMenuData.meta_value, 10);
        console.log('Last selected menu ID from user_meta:', lastMenuId);
        const menuExists = menusData.menus.some((m: any) => m.id === lastMenuId);
        console.log('Menu exists?', menuExists);
        if (menuExists) {
          menuIdToSelect = lastMenuId;
        }
      }
      
      // Fallback to first menu if no preference or preference doesn't exist
      if (!menuIdToSelect) {
        menuIdToSelect = menusData.menus[0].id;
        console.log('Using first menu as fallback:', menuIdToSelect);
      }
      
      console.log('Setting selected menu ID to:', menuIdToSelect);
      setSelectedMenuId(menuIdToSelect);
    }
  }, [menuPreferenceLoaded, menusLoading, prefLoading, lastMenuData, menusData]);

  // Save selected menu to user preferences
  const saveMenuPreference = async (menuId: number) => {
    try {
      await axios.put('/api/user/meta', {
        meta_key: 'last_selected_menu',
        meta_value: menuId.toString(),
      });
    } catch (error) {
      // Silent fail
    }
  };

  // Fetch menu items for selected menu
  const { data: menuItemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['menu-items', selectedMenuId],
    queryFn: async () => {
      if (!selectedMenuId) return { items: [] };
      const res = await axios.get(`/api/menu-items?menu_id=${selectedMenuId}`);
      return res.data;
    },
    enabled: !!selectedMenuId,
  });

  // Sync server data to local state
  useEffect(() => {
    if (menuItemsData?.items) {
      setLocalMenuItems(menuItemsData.items);
      setDeletedItemIds([]);
      setHasUnsavedChanges(false);
    }
  }, [menuItemsData]);

  // Load menu form data when menu is selected
  useEffect(() => {
    if (selectedMenuId && menusData?.menus) {
      const menu = menusData.menus.find((m: any) => m.id === selectedMenuId);
      if (menu) {
        setMenuFormData({
          name: menu.name,
          location: menu.location,
          description: menu.description || '',
        });
        setHasMenuChanges(false);
      }
    }
  }, [selectedMenuId, menusData]);

  // Fetch post types
  const { data: postTypesData } = useQuery({
    queryKey: ['post-types'],
    queryFn: async () => {
      const res = await axios.get('/api/post-types');
      return res.data;
    },
  });

  // Fetch taxonomies
  const { data: taxonomiesData } = useQuery({
    queryKey: ['taxonomies'],
    queryFn: async () => {
      const res = await axios.get('/api/taxonomies');
      return res.data;
    },
  });

  // Fetch posts for selected post type
  const { data: postsData } = useQuery({
    queryKey: ['posts-for-menu', postTypeFilter, postSearchQuery],
    queryFn: async () => {
      if (!postTypeFilter) return { posts: [] };
      const searchParam = postSearchQuery ? `&search=${encodeURIComponent(postSearchQuery)}` : '';
      const res = await axios.get(`/api/posts?post_type=${postTypeFilter}&status=published&limit=20${searchParam}`);
      return res.data;
    },
    enabled: !!postTypeFilter,
  });

  // Fetch terms for selected taxonomy
  const { data: termsData } = useQuery({
    queryKey: ['terms-for-menu', taxonomyFilter, termSearchQuery],
    queryFn: async () => {
      if (!taxonomyFilter) return { terms: [] };
      const searchParam = termSearchQuery ? `&search=${encodeURIComponent(termSearchQuery)}` : '';
      const res = await axios.get(`/api/terms?taxonomy_id=${taxonomyFilter}&limit=50${searchParam}`);
      return res.data;
    },
    enabled: !!taxonomyFilter,
  });

  // Fetch menu locations
  const { data: locationsData } = useQuery({
    queryKey: ['menu-locations'],
    queryFn: async () => {
      const res = await axios.get('/api/menu-locations');
      return res.data;
    },
  });

  // Mutations
  const createMenuMutation = useMutation({
    mutationFn: async (data: typeof menuFormData) => {
      const res = await axios.post('/api/menus', data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      toast.success('Menu created successfully');
      setIsCreatingMenu(false);
      setMenuFormData({ name: '', location: '', description: '' });
      handleMenuSelect(data.menu.id);
    },
    onError: () => {
      toast.error('Failed to create menu');
    },
  });

  const deleteMenuMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await axios.delete(`/api/menus/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      toast.success('Menu deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete menu');
    },
  });



  // Handlers
  const handleMenuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMenuMutation.mutate(menuFormData);
  };

  const handleSaveAll = async () => {
    if (!selectedMenuId) return;

    setIsSaving(true);

    try {
      // Delete removed items first (only existing items with positive IDs)
      for (const itemId of deletedItemIds) {
        if (itemId > 0) {
          await axios.delete(`/api/menu-items/${itemId}`);
        }
      }

      // Save menu details if changed
      if (hasMenuChanges) {
        await axios.put(`/api/menus/${selectedMenuId}`, menuFormData);
      }

      // Process menu items if changed
      if (hasUnsavedChanges) {
        const itemsToSave = localMenuItems.filter(item => !deletedItemIds.includes(item.id));
        
        // Create new items first
        const newItems = itemsToSave.filter(item => item.isNew || item.id < 0);
        const idMapping: { [key: number]: number } = {}; // Map temp IDs to real IDs
        
        for (let i = 0; i < newItems.length; i++) {
          const item = newItems[i];
          const response = await axios.post('/api/menu-items', {
            menu_id: selectedMenuId,
            parent_id: item.parent_id && item.parent_id < 0 ? null : item.parent_id,
            type: item.type,
            object_id: item.object_id,
            post_type: item.post_type,
            custom_url: item.custom_url,
            custom_label: item.custom_label,
            menu_order: i, // Use index for order
            target: item.target,
          });
          
          // Map temp ID to real ID
          idMapping[item.id] = response.data.item.id;
          
          // Save meta for new item
          const meta = {
            title_attr: item.title_attr || '',
            css_classes: item.css_classes || '',
            xfn: item.xfn || '',
            description: item.description || '',
          };
          await axios.put(`/api/menu-items/${response.data.item.id}/meta`, { meta });
        }

        // Update ALL items (both new and existing) to ensure correct order
        const allItems = itemsToSave.map((item, index) => {
          // Use real ID if this was a new item
          const realId = item.id < 0 && idMapping[item.id] ? idMapping[item.id] : item.id;
          
          // Remap parent_id if it was a temp ID
          let parentId = item.parent_id;
          if (parentId && parentId < 0 && idMapping[parentId]) {
            parentId = idMapping[parentId];
          }
          
          return {
            id: realId,
            parent_id: parentId,
            menu_order: index, // Use the array index as the order
            custom_label: item.custom_label,
            custom_url: item.custom_url,
            target: item.target,
          };
        });

        // Only send existing items to reorder endpoint (new items already have order)
        const existingItemsUpdates = allItems.filter(item => item.id > 0);
        if (existingItemsUpdates.length > 0) {
          await axios.put('/api/menu-items/reorder', { items: existingItemsUpdates });
        }

        // Save meta data for all items (both new and existing)
        for (const item of itemsToSave) {
          const realId = item.id < 0 && idMapping[item.id] ? idMapping[item.id] : item.id;
          if (realId > 0) {
            const meta = {
              title_attr: item.title_attr || '',
              css_classes: item.css_classes || '',
              xfn: item.xfn || '',
              description: item.description || '',
            };
            await axios.put(`/api/menu-items/${realId}/meta`, { meta });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['menus'] });
      queryClient.invalidateQueries({ queryKey: ['menu-items', selectedMenuId] });
      
      setHasMenuChanges(false);
      setHasUnsavedChanges(false);
      setDeletedItemIds([]);
      toast.success('Menu updated successfully');
    } catch (error) {
      toast.error('Failed to update menu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelChanges = () => {
    // Revert menu form
    if (selectedMenuId && menusData?.menus) {
      const menu = menusData.menus.find((m: any) => m.id === selectedMenuId);
      if (menu) {
        setMenuFormData({
          name: menu.name,
          location: menu.location,
          description: menu.description || '',
        });
        setHasMenuChanges(false);
      }
    }

    // Revert menu items and deletions
    if (menuItemsData?.items) {
      setLocalMenuItems(menuItemsData.items);
      setDeletedItemIds([]);
      setHasUnsavedChanges(false);
    }

    setEditingItemId(null);
    toast.success('Changes discarded');
  };

  const handleMenuSelect = (menuId: number) => {
    if (hasUnsavedChanges || hasMenuChanges) {
      if (!confirm('You have unsaved changes. Do you want to discard them?')) {
        return;
      }
    }
    setSelectedMenuId(menuId);
    saveMenuPreference(menuId);
    setEditingItemId(null);
    setLocalMenuItems([]); // Clear items immediately
    setDeletedItemIds([]);
    setHasUnsavedChanges(false);
    setHasMenuChanges(false);
    setIsCreatingMenu(false);
    setIsAddingItem(false);
  };

  const handleDragStart = (e: React.DragEvent, item: any) => {
    setDraggedItem(item);
    setDragIndent(item.parent_id ? 1 : 0);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    setDropTarget(dropIndex);

    // Calculate indent based on horizontal mouse position
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Check if we can make this a child (need a parent item above)
    if (x > 60 && dropIndex > 0) {
      const itemAbove = localMenuItems[dropIndex - 1];
      // Can only be a child if the item above is top-level
      if (itemAbove && (!itemAbove.parent_id || itemAbove.parent_id === 0)) {
        setDragIndent(1);
        return;
      }
    }
    
    setDragIndent(0);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedItem) {
      setDropTarget(null);
      setDragIndent(0);
      return;
    }

    const items = [...localMenuItems];
    const draggedIndex = items.findIndex(i => i.id === draggedItem.id);

    if (draggedIndex === -1) return;

    // Remove the dragged item
    const [removed] = items.splice(draggedIndex, 1);
    
    // Adjust drop index if dragging downward
    let adjustedDropIndex = dropIndex;
    if (draggedIndex < dropIndex) {
      adjustedDropIndex--;
    }
    
    // Determine parent based on indent
    let newParentId = null;
    if (dragIndent === 1 && adjustedDropIndex > 0) {
      // Find the previous top-level item
      for (let i = adjustedDropIndex - 1; i >= 0; i--) {
        if (!items[i].parent_id || items[i].parent_id === 0) {
          newParentId = items[i].id;
          break;
        }
      }
    }
    
    removed.parent_id = newParentId;
    
    // Insert at the new position
    items.splice(adjustedDropIndex, 0, removed);

    setLocalMenuItems(items);
    setHasUnsavedChanges(true);
    setDraggedItem(null);
    setDropTarget(null);
    setDragIndent(0);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
    setDragIndent(0);
  };

  const handleEditItem = (itemId: number) => {
    setEditingItemId(editingItemId === itemId ? null : itemId);
  };

  const handleUpdateItem = (itemId: number, field: string, value: any) => {
    const updatedItems = localMenuItems.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    );
    setLocalMenuItems(updatedItems);
    setHasUnsavedChanges(true);
  };

  const handleDeleteItem = (id: number) => {
    // Mark for deletion (don't actually delete until save)
    setDeletedItemIds(prev => [...prev, id]);
    setHasUnsavedChanges(true);
    setEditingItemId(null);
  };

  const handleAddItem = (payload: any) => {
    if (!selectedMenuId) return;
    
    const maxOrder = localMenuItems.reduce((max: number, item: any) => 
      Math.max(max, item.menu_order || 0), 0) || 0;
    
    // Add to local state with temporary negative ID
    const tempId = -(Date.now());
    const newItem: any = {
      id: tempId,
      menu_id: selectedMenuId,
      parent_id: null,
      menu_order: maxOrder + 1,
      ...payload,
      isNew: true, // Flag to identify new items
    };

    // Populate display labels for immediate display
    if (payload.type === 'post_type') {
      const postType = postTypesData?.postTypes?.find((pt: any) => pt.id === payload.object_id);
      if (postType) {
        newItem.post_type_label = postType.label;
      }
    } else if (payload.type === 'taxonomy') {
      const taxonomy = taxonomiesData?.taxonomies?.find((tax: any) => tax.id === payload.object_id);
      if (taxonomy) {
        newItem.taxonomy_label = taxonomy.label;
      }
    } else if (payload.type === 'term') {
      const term = termsData?.terms?.find((t: any) => t.id === payload.object_id);
      if (term) {
        newItem.term_name = term.name;
        const taxonomy = taxonomiesData?.taxonomies?.find((tax: any) => tax.id === term.taxonomy_id);
        if (taxonomy) {
          newItem.term_taxonomy_label = taxonomy.label;
        }
      }
    } else if (payload.type === 'post') {
      const post = postsData?.posts?.find((p: any) => p.id === payload.object_id);
      if (post) {
        newItem.post_title = post.title;
      }
    }
    
    setLocalMenuItems(prev => [...prev, newItem]);
    setHasUnsavedChanges(true);
    setIsAddingItem(false);
    toast.success('Menu item added (will save when you click Update Menu)');
  };

  const handleMenuFormChange = (field: string, value: string) => {
    setMenuFormData(prev => ({ ...prev, [field]: value }));
    setHasMenuChanges(true);
  };

  const handleDeleteMenu = () => {
    if (!selectedMenuId) return;
    if (confirm(`Delete menu "${menuFormData.name}"?`)) {
      deleteMenuMutation.mutate(selectedMenuId);
      setSelectedMenuId(null);
    }
  };

  if (permissionLoading || menusLoading || prefLoading || !menuPreferenceLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menus...</p>
        </div>
      </div>
    );
  }

  const hasAnyChanges = hasMenuChanges || hasUnsavedChanges;

  return (
    <div className="-m-8 h-[calc(100vh-4rem)]">
      {/* Loading Overlay */}
      {isSaving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-xl text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-gray-900">Updating Menu...</p>
            <p className="text-sm text-gray-600 mt-2">Please wait while we save your changes</p>
          </div>
        </div>
      )}

      <NavigationHeader
        selectedMenuId={selectedMenuId}
        menuName={menuFormData.name}
        hasAnyChanges={hasAnyChanges}
        onSave={handleSaveAll}
        onCancel={handleCancelChanges}
        onDelete={handleDeleteMenu}
      />

      {/* Scrollable Content */}
      <div className="overflow-y-auto h-[calc(100vh-8rem)]">
        <div className="px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <MenuList
              menus={menusData?.menus || []}
              selectedMenuId={selectedMenuId}
              onMenuSelect={handleMenuSelect}
              onCreateNew={() => {
                setIsCreatingMenu(true);
                setMenuFormData({ name: '', location: '', description: '' });
              }}
            />

            {isCreatingMenu ? (
              <MenuForm
                mode="create"
                formData={menuFormData}
                isPending={createMenuMutation.isPending}
                locations={locationsData?.locations || []}
                onChange={handleMenuFormChange}
                onSubmit={handleMenuSubmit}
                onCancel={() => {
                  setIsCreatingMenu(false);
                  setMenuFormData({ name: '', location: '', description: '' });
                }}
              />
            ) : selectedMenuId && (
              <MenuForm
                mode="edit"
                formData={menuFormData}
                isPending={false}
                locations={locationsData?.locations || []}
                onChange={handleMenuFormChange}
                onSubmit={(e) => e.preventDefault()}
                onCancel={() => {}}
              />
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {selectedMenuId ? (
              <>
                {isAddingItem && (
                  <AddMenuItemForm
                    postTypesData={postTypesData}
                    taxonomiesData={taxonomiesData}
                    postsData={postsData}
                    termsData={termsData}
                    onSubmit={handleAddItem}
                    onCancel={() => {
                      setIsAddingItem(false);
                      setPostTypeFilter('');
                      setPostSearchQuery('');
                      setTaxonomyFilter(null);
                      setTermSearchQuery('');
                    }}
                    onPostTypeFilterChange={setPostTypeFilter}
                    onPostSearchChange={setPostSearchQuery}
                    onTaxonomyFilterChange={setTaxonomyFilter}
                    onTermSearchChange={setTermSearchQuery}
                  />
                )}
                
                <MenuItemsList
                  items={localMenuItems.filter(item => !deletedItemIds.includes(item.id))}
                  isLoading={itemsLoading}
                  draggedItem={draggedItem}
                  dropTarget={dropTarget}
                  dragIndent={dragIndent}
                  editingItemId={editingItemId}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                  onAddNew={() => {
                    setIsAddingItem(true);
                    setEditingItemId(null);
                  }}
                  onUpdateItem={handleUpdateItem}
                  postTypesData={postTypesData}
                />
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center py-12 text-gray-500">
                <p>Select a menu from the left to manage its items</p>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
