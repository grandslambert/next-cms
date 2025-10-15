'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

interface CategorySelectorProps {
  selectedCategories: number[];
  onToggle: (categoryId: number) => void;
}

export default function CategorySelector({ selectedCategories, onToggle }: CategorySelectorProps) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const queryClient = useQueryClient();

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await axios.get('/api/categories');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await axios.post('/api/categories', { name });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created successfully');
      setNewCategoryName('');
      setShowNewForm(false);
      // Auto-select the newly created category
      onToggle(data.category.id);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create category');
    },
  });

  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      createMutation.mutate(newCategoryName.trim());
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
      
      {categoriesData?.categories && categoriesData.categories.length > 0 ? (
        <div className="space-y-2 mb-4">
          {categoriesData.categories.map((category: any) => (
            <label key={category.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
              <input
                type="checkbox"
                checked={selectedCategories.includes(category.id)}
                onChange={() => onToggle(category.id)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 flex-shrink-0"
              />
              {category.image_url && (
                <img
                  src={category.image_url}
                  alt={category.name}
                  className="w-8 h-8 object-cover rounded ml-2 flex-shrink-0"
                />
              )}
              <span className="ml-2 text-sm text-gray-700">{category.name}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-4">No categories yet.</p>
      )}

      <div className="border-t pt-4">
        {!showNewForm ? (
          <button
            type="button"
            onClick={() => setShowNewForm(true)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            + Add New Category
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateCategory();
                }
              }}
              placeholder="Category name"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleCreateCategory}
                disabled={createMutation.isPending || !newCategoryName.trim()}
                className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Adding...' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewForm(false);
                  setNewCategoryName('');
                }}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

