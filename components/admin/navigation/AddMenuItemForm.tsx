'use client';

import { useState } from 'react';

interface AddMenuItemFormProps {
  postTypesData: any;
  taxonomiesData: any;
  postsData: any;
  termsData: any;
  onSubmit: (payload: any) => void;
  onCancel: () => void;
  onPostTypeFilterChange: (postType: string) => void;
  onPostSearchChange: (search: string) => void;
  onTaxonomyFilterChange: (taxonomyId: number | null) => void;
  onTermSearchChange: (search: string) => void;
}

export default function AddMenuItemForm({
  postTypesData,
  taxonomiesData,
  postsData,
  termsData,
  onSubmit,
  onCancel,
  onPostTypeFilterChange,
  onPostSearchChange,
  onTaxonomyFilterChange,
  onTermSearchChange,
}: AddMenuItemFormProps) {
  const [formData, setFormData] = useState({
    type: 'custom' as 'post_type' | 'taxonomy' | 'custom',
    post_type_filter: '',
    taxonomy_filter: null as number | null,
    object_id: null as number | null,
    is_archive: false,
    custom_url: '',
    custom_label: '',
    target: '_self',
  });
  const [postSearchQuery, setPostSearchQuery] = useState('');
  const [termSearchQuery, setTermSearchQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload: any = { target: formData.target };

    if (formData.type === 'custom') {
      payload.type = 'custom';
      payload.custom_url = formData.custom_url;
      payload.custom_label = formData.custom_label;
    } else if (formData.type === 'post_type') {
      if (formData.is_archive) {
        payload.type = 'post_type';
        payload.object_id = formData.object_id;
        payload.custom_label = formData.custom_label;
      } else {
        payload.type = 'post';
        payload.object_id = formData.object_id;
        payload.post_type = formData.post_type_filter;
        payload.custom_label = formData.custom_label;
      }
    } else if (formData.type === 'taxonomy') {
      if (formData.is_archive) {
        payload.type = 'taxonomy';
        payload.object_id = formData.taxonomy_filter;
        payload.custom_label = formData.custom_label;
      } else {
        payload.type = 'term';
        payload.object_id = formData.object_id;
        payload.custom_label = formData.custom_label;
      }
    }

    onSubmit(payload);
  };

  const handleTypeChange = (newType: string) => {
    setFormData({ 
      type: newType as any, 
      post_type_filter: '',
      taxonomy_filter: null,
      object_id: null,
      is_archive: false,
      custom_url: '',
      custom_label: '',
      target: '_self',
    });
    setPostSearchQuery('');
    setTermSearchQuery('');
  };

  const handlePostTypeFilterChange = (postType: string) => {
    const selectedPostType = postTypesData?.postTypes?.find((pt: any) => pt.name === postType);
    setFormData({ 
      ...formData, 
      post_type_filter: postType, 
      object_id: selectedPostType?.id || null,
      is_archive: false,
    });
    onPostTypeFilterChange(postType);
  };

  const handlePostSearchChange = (search: string) => {
    setPostSearchQuery(search);
    onPostSearchChange(search);
  };

  const handleTaxonomyFilterChange = (taxonomyId: number) => {
    setFormData({ 
      ...formData, 
      taxonomy_filter: taxonomyId,
      object_id: null,
      is_archive: true, // Default to archive page (first option in dropdown)
    });
    onTaxonomyFilterChange(taxonomyId);
  };

  const handleTermSearchChange = (search: string) => {
    setTermSearchQuery(search);
    onTermSearchChange(search);
  };

  return (
    <div className="bg-primary-50 border-2 border-primary-500 rounded-lg p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Add Menu Item</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="add-item-type" className="block text-sm font-medium text-gray-700 mb-1">
            Type *
          </label>
          <select
            id="add-item-type"
            value={formData.type}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="custom">Custom Link</option>
            <option value="post_type">Post Type / Page</option>
            <option value="taxonomy">Taxonomy Archive</option>
          </select>
        </div>

        {formData.type === 'custom' && (
          <>
            <div>
              <label htmlFor="add-item-url" className="block text-sm font-medium text-gray-700 mb-1">
                URL *
              </label>
              <input
                id="add-item-url"
                type="text"
                value={formData.custom_url}
                onChange={(e) => setFormData({ ...formData, custom_url: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="/about, https://example.com"
                required
              />
            </div>
            <div>
              <label htmlFor="add-item-label" className="block text-sm font-medium text-gray-700 mb-1">
                Label *
              </label>
              <input
                id="add-item-label"
                type="text"
                value={formData.custom_label}
                onChange={(e) => setFormData({ ...formData, custom_label: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="About Us"
                required
              />
            </div>
          </>
        )}

        {formData.type === 'post_type' && (
          <>
            <div>
              <label htmlFor="add-item-post-type" className="block text-sm font-medium text-gray-700 mb-1">
                Post Type *
              </label>
              <select
                id="add-item-post-type"
                value={formData.post_type_filter}
                onChange={(e) => handlePostTypeFilterChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Select Post Type</option>
                {postTypesData?.postTypes?.map((pt: any) => (
                  <option key={pt.name} value={pt.name}>{pt.label}</option>
                ))}
              </select>
            </div>

            {formData.post_type_filter && (
              <>
                <div>
                  <label htmlFor="add-post-search" className="block text-sm font-medium text-gray-700 mb-1">
                    Search Posts
                  </label>
                  <input
                    id="add-post-search"
                    type="text"
                    value={postSearchQuery}
                    onChange={(e) => handlePostSearchChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Search by title..."
                  />
                </div>

                <div>
                  <label htmlFor="add-item-selection" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Item *
                  </label>
                  <select
                    id="add-item-selection"
                    value={formData.is_archive ? 'archive' : (formData.object_id || '')}
                    onChange={(e) => {
                      if (e.target.value === 'archive') {
                        const selectedPostType = postTypesData?.postTypes?.find((pt: any) => pt.name === formData.post_type_filter);
                        setFormData({ 
                          ...formData, 
                          is_archive: true,
                          object_id: selectedPostType?.id || null,
                        });
                      } else {
                        setFormData({ 
                          ...formData, 
                          is_archive: false,
                          object_id: Number.parseInt(e.target.value),
                        });
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    size={6}
                    required
                  >
                    <option value="archive">📚 Archive Page</option>
                    {postsData?.posts?.map((post: any) => (
                      <option key={post.id} value={post.id}>
                        {post.title}
                      </option>
                    ))}
                  </select>
                  {postsData?.posts?.length === 0 && postSearchQuery && (
                    <p className="text-xs text-gray-500 mt-1">No posts found</p>
                  )}
                </div>

                <div>
                  <label htmlFor="add-item-custom-label" className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Label (optional)
                  </label>
                  <input
                    id="add-item-custom-label"
                    type="text"
                    value={formData.custom_label}
                    onChange={(e) => setFormData({ ...formData, custom_label: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Override default label"
                  />
                </div>
              </>
            )}
          </>
        )}

        {formData.type === 'taxonomy' && (
          <>
            <div>
              <label htmlFor="add-item-taxonomy" className="block text-sm font-medium text-gray-700 mb-1">
                Taxonomy *
              </label>
              <select
                id="add-item-taxonomy"
                value={formData.taxonomy_filter || ''}
                onChange={(e) => handleTaxonomyFilterChange(Number.parseInt(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Select Taxonomy</option>
                {taxonomiesData?.taxonomies?.map((tax: any) => (
                  <option key={tax.id} value={tax.id}>{tax.label}</option>
                ))}
              </select>
            </div>

            {formData.taxonomy_filter && (
              <>
                <div>
                  <label htmlFor="add-term-search" className="block text-sm font-medium text-gray-700 mb-1">
                    Search Terms
                  </label>
                  <input
                    id="add-term-search"
                    type="text"
                    value={termSearchQuery}
                    onChange={(e) => handleTermSearchChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Search by name..."
                  />
                </div>

                <div>
                  <label htmlFor="add-item-term-selection" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Item *
                  </label>
                  <select
                    id="add-item-term-selection"
                    value={formData.is_archive ? 'archive' : (formData.object_id?.toString() || '')}
                    onChange={(e) => {
                      if (e.target.value === 'archive') {
                        setFormData({ 
                          ...formData, 
                          is_archive: true,
                          object_id: null, // Clear object_id for archive
                        });
                      } else {
                        setFormData({ 
                          ...formData, 
                          is_archive: false,
                          object_id: Number.parseInt(e.target.value),
                        });
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    size={6}
                    required
                  >
                    <option value="archive">📚 Archive Page</option>
                    {termsData?.terms?.map((term: any) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                  {termsData?.terms?.length === 0 && termSearchQuery && (
                    <p className="text-xs text-gray-500 mt-1">No terms found</p>
                  )}
                </div>

                <div>
                  <label htmlFor="add-item-tax-label" className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Label (optional)
                  </label>
                  <input
                    id="add-item-tax-label"
                    type="text"
                    value={formData.custom_label}
                    onChange={(e) => setFormData({ ...formData, custom_label: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Override default label"
                  />
                </div>
              </>
            )}
          </>
        )}

        <div>
          <label htmlFor="add-item-target" className="block text-sm font-medium text-gray-700 mb-1">
            Link Target
          </label>
          <select
            id="add-item-target"
            value={formData.target}
            onChange={(e) => setFormData({ ...formData, target: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="_self">Same Window</option>
            <option value="_blank">New Window</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
          >
            Add Item
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}


