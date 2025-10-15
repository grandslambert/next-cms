'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import RichTextEditor from '@/components/admin/RichTextEditor';
import MediaSelector from '@/components/admin/MediaSelector';

interface PostTypeFormProps {
  readonly postTypeSlug: string;
  readonly postId?: string;
  readonly isEdit?: boolean;
}

// Helper to generate public URL based on post type structure and hierarchy
async function getPublicUrl(postType: any, slug: string, post: any, allPosts?: any[]): Promise<string> {
  const baseSlug = postType?.slug || '';
  const basePath = baseSlug ? `/${baseSlug}` : '';
  
  // Build hierarchical slug path
  let slugPath = slug;
  if (postType?.hierarchical && post?.parent_id && allPosts) {
    const parentSlugs: string[] = [];
    let currentParentId = post.parent_id;
    let iterations = 0;
    const maxIterations = 10;
    
    while (currentParentId && iterations < maxIterations) {
      const parent = allPosts.find((p: any) => p.id === currentParentId);
      if (!parent) break;
      parentSlugs.unshift(parent.slug);
      currentParentId = parent.parent_id;
      iterations++;
    }
    
    if (parentSlugs.length > 0) {
      slugPath = `${parentSlugs.join('/')}/${slug}`;
    }
  }
  
  // Add date components if needed
  if (post?.published_at && postType?.url_structure !== 'default') {
    const date = new Date(post.published_at);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    switch (postType.url_structure) {
      case 'year':
        return `${basePath}/${year}/${slugPath}`;
      case 'year_month':
        return `${basePath}/${year}/${month}/${slugPath}`;
      case 'year_month_day':
        return `${basePath}/${year}/${month}/${day}/${slugPath}`;
    }
  }
  
  return basePath ? `${basePath}/${slugPath}` : `/${slugPath}`;
}

export default function PostTypeForm({ postTypeSlug, postId, isEdit = false }: PostTypeFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [status, setStatus] = useState('draft');
  const [parentId, setParentId] = useState<number | null>(null);
  const [menuOrder, setMenuOrder] = useState(0);
  const [selectedTerms, setSelectedTerms] = useState<{[taxonomyId: number]: number[]}>({});
  const [featuredImageId, setFeaturedImageId] = useState<number | null>(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [newTermName, setNewTermName] = useState<{[taxonomyId: number]: string}>({});
  const [creatingTerm, setCreatingTerm] = useState<number | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  // Fetch post type info
  const { data: postTypeData } = useQuery({
    queryKey: ['post-type', postTypeSlug],
    queryFn: async () => {
      const res = await axios.get('/api/post-types');
      const postType = res.data.postTypes.find((pt: any) => pt.name === postTypeSlug);
      return postType;
    },
  });

  // Fetch post data (edit mode only)
  const { data, isLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const res = await axios.get(`/api/posts/${postId}`);
      return res.data;
    },
    enabled: isEdit && !!postId,
  });

  // Fetch taxonomies assigned to this post type
  const { data: postTypeTaxonomiesData } = useQuery({
    queryKey: ['post-type-taxonomies', postTypeData?.id],
    queryFn: async () => {
      const res = await axios.get(`/api/post-types/${postTypeData.id}/taxonomies`);
      return res.data;
    },
    enabled: !!postTypeData?.id,
  });

  // Fetch all terms for assigned taxonomies
  const { data: allTermsData } = useQuery({
    queryKey: ['all-terms', postTypeTaxonomiesData?.taxonomies],
    queryFn: async () => {
      if (!postTypeTaxonomiesData?.taxonomies) return null;
      
      const termsPromises = postTypeTaxonomiesData.taxonomies.map((taxonomy: any) =>
        axios.get(`/api/terms?taxonomy_id=${taxonomy.id}`).then(res => ({
          taxonomyId: taxonomy.id,
          taxonomy: taxonomy,
          terms: res.data.terms || []
        }))
      );
      
      const results = await Promise.all(termsPromises);
      return results;
    },
    enabled: !!postTypeTaxonomiesData?.taxonomies && postTypeTaxonomiesData.taxonomies.length > 0,
  });

  // Fetch terms for this post (edit mode only)
  const { data: postTermsData } = useQuery({
    queryKey: ['post-terms', postId],
    queryFn: async () => {
      const res = await axios.get(`/api/posts/${postId}/terms`);
      return res.data;
    },
    enabled: isEdit && !!postId,
  });

  // Fetch all posts of this type for parent selector (if hierarchical)
  const { data: allPostsData } = useQuery({
    queryKey: ['posts', postTypeSlug, 'all'],
    queryFn: async () => {
      const res = await axios.get(`/api/posts?post_type=${postTypeSlug}&limit=1000`);
      return res.data;
    },
    enabled: !!postTypeData?.hierarchical,
  });

  // Load post data
  useEffect(() => {
    if (data?.post) {
      setTitle(data.post.title || '');
      setSlug(data.post.slug || '');
      setContent(data.post.content || '');
      setExcerpt(data.post.excerpt || '');
      setStatus(data.post.status || 'draft');
      setParentId(data.post.parent_id || null);
      setMenuOrder(data.post.menu_order || 0);
      setFeaturedImageId(data.post.featured_image_id || null);
      setFeaturedImageUrl(data.post.featured_image_url || '');
      setSlugEdited(true); // Existing posts already have a slug
    }
  }, [data]);

  // Auto-generate slug from title (only if slug hasn't been manually edited)
  useEffect(() => {
    if (!slugEdited && title) {
      const autoSlug = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(autoSlug);
    }
  }, [title, slugEdited]);

  // Update preview URL when slug, parent, or status changes
  useEffect(() => {
    if (slug && postTypeData && (isEdit || parentId)) {
      const postData = isEdit && data?.post ? { ...data.post, parent_id: parentId } : { parent_id: parentId };
      getPublicUrl(postTypeData, slug, postData, allPostsData?.posts).then(url => {
        setPreviewUrl(url);
      });
    }
  }, [slug, parentId, data?.post, postTypeData, allPostsData, isEdit]);

  // Load selected terms when editing
  useEffect(() => {
    if (postTermsData?.terms && allTermsData) {
      const termsByTaxonomy: {[taxonomyId: number]: number[]} = {};
      
      postTermsData.terms.forEach((term: any) => {
        if (!termsByTaxonomy[term.taxonomy_id]) {
          termsByTaxonomy[term.taxonomy_id] = [];
        }
        termsByTaxonomy[term.taxonomy_id].push(term.id);
      });
      
      setSelectedTerms(termsByTaxonomy);
    }
  }, [postTermsData, allTermsData]);

  // Check for messages after page load (for create -> redirect to edit)
  useEffect(() => {
    const successMessage = sessionStorage.getItem('cms_success_message');
    const errorMessage = sessionStorage.getItem('cms_error_message');
    
    if (successMessage) {
      toast.success(successMessage, { duration: 4000 });
      sessionStorage.removeItem('cms_success_message');
    }
    
    if (errorMessage) {
      toast.error(errorMessage, { duration: 5000 });
      sessionStorage.removeItem('cms_error_message');
    }
  }, []);

  // Refetch post terms after post data is loaded
  useEffect(() => {
    if (isEdit && postId && data?.post) {
      queryClient.invalidateQueries({ queryKey: ['post-terms', postId] });
    }
  }, [isEdit, postId, data?.post, queryClient]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await axios.post('/api/posts', data);
      const newPostId = res.data.post.id;

      // Save terms for each taxonomy
      if (postTypeTaxonomiesData?.taxonomies) {
        const termPromises = postTypeTaxonomiesData.taxonomies.map((taxonomy: any) => {
          const termIds = selectedTerms[taxonomy.id] || [];
          return axios.put(`/api/posts/${newPostId}/terms`, {
            taxonomy_id: taxonomy.id,
            term_ids: termIds,
          });
        });
        await Promise.all(termPromises);
      }

      return { ...res.data, newPostId };
    },
    onSuccess: (data) => {
      const message = data.post.status === 'published' 
        ? `${postTypeData?.singular_label || 'Item'} published successfully!`
        : `${postTypeData?.singular_label || 'Item'} saved as draft`;
      // Store message to show after redirect
      sessionStorage.setItem('cms_success_message', message);
      // Redirect to edit page with the new post ID
      router.push(`/admin/post-type/${postTypeSlug}/${data.newPostId}`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || `Failed to create ${postTypeData?.singular_label?.toLowerCase() || 'item'}`;
      toast.error(errorMessage, { duration: 5000 });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await axios.put(`/api/posts/${postId}`, data);

      // Update terms for each taxonomy
      if (postTypeTaxonomiesData?.taxonomies) {
        const termPromises = postTypeTaxonomiesData.taxonomies.map((taxonomy: any) => {
          const termIds = selectedTerms[taxonomy.id] || [];
          return axios.put(`/api/posts/${postId}/terms`, {
            taxonomy_id: taxonomy.id,
            term_ids: termIds,
          });
        });
        await Promise.all(termPromises);
      }
      
      return res.data;
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts', postTypeSlug] });
      queryClient.invalidateQueries({ queryKey: ['post-terms', postId] });
      
      const message = data.post?.status === 'published' 
        ? `${postTypeData?.singular_label || 'Item'} published successfully!`
        : `${postTypeData?.singular_label || 'Item'} updated successfully`;
      
      // Update local state immediately
      if (data.post) {
        setTitle(data.post.title || '');
        setSlug(data.post.slug || '');
        setSlugEdited(true); // Mark as edited so auto-generation stops
        setContent(data.post.content || '');
        setExcerpt(data.post.excerpt || '');
        setStatus(data.post.status || 'draft');
        setParentId(data.post.parent_id || null);
        setMenuOrder(data.post.menu_order || 0);
        setFeaturedImageId(data.post.featured_image_id || null);
        setFeaturedImageUrl(data.post.featured_image_url || '');
      }
      
      toast.success(message, { duration: 3000 });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || `Failed to update ${postTypeData?.singular_label?.toLowerCase() || 'item'}`;
      toast.error(errorMessage, { duration: 5000 });
    },
  });

  const handleSubmit = (e: React.FormEvent, publishStatus?: string) => {
    e.preventDefault();
    
    if (!slug) {
      toast.error('Slug is required', { duration: 3000 });
      return;
    }
    
    const finalStatus = publishStatus || status;
    const data: any = {
      post_type: postTypeSlug,
      title,
      slug,
      status: finalStatus,
    };

    if (postTypeData?.supports?.content) data.content = content;
    if (postTypeData?.supports?.excerpt) data.excerpt = excerpt;
    if (postTypeData?.supports?.featured_image) data.featured_image_id = featuredImageId;
    if (postTypeData?.hierarchical) {
      data.parent_id = parentId;
      data.menu_order = menuOrder;
    }

    if (isEdit) {
      updateMutation.mutate(data);
      // Update status immediately for UI feedback
      setStatus(finalStatus);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    handleSubmit(e, 'draft');
  };

  const handlePublish = (e: React.FormEvent) => {
    handleSubmit(e, 'published');
  };

  const handleCreateTerm = async (taxonomyId: number) => {
    const name = newTermName[taxonomyId]?.trim();
    if (!name) {
      toast.error('Please enter a term name', { duration: 3000 });
      return;
    }

    setCreatingTerm(taxonomyId);
    try {
      const res = await axios.post('/api/terms', {
        taxonomy_id: taxonomyId,
        name: name,
      });

      const newTerm = res.data.term;

      // Add the new term to selectedTerms
      setSelectedTerms((prev) => ({
        ...prev,
        [taxonomyId]: [...(prev[taxonomyId] || []), newTerm.id],
      }));

      // Clear the input
      setNewTermName((prev) => ({
        ...prev,
        [taxonomyId]: '',
      }));

      // Refresh the terms list
      if (allTermsData) {
        const taxonomyData = allTermsData.find((t: any) => t.taxonomyId === taxonomyId);
        if (taxonomyData) {
          taxonomyData.terms.push(newTerm);
        }
      }

      const taxonomyLabel = allTermsData?.find((t: any) => t.taxonomyId === taxonomyId)?.taxonomy?.singular_label || 'Term';
      toast.success(`${taxonomyLabel} "${newTerm.name}" created and added`, { duration: 3000 });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create term';
      toast.error(errorMessage, { duration: 4000 });
    } finally {
      setCreatingTerm(null);
    }
  };

  if (isLoading || !postTypeData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isEdit && !data?.post) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{postTypeData.singular_label} Not Found</h2>
        <p className="text-gray-600">The {postTypeData.singular_label.toLowerCase()} you're looking for doesn't exist.</p>
      </div>
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="relative">
      {/* Loading Overlay */}
      {isSaving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 shadow-2xl">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600"></div>
              <p className="text-lg font-medium text-gray-900">
                {createMutation.isPending ? 'Creating...' : 'Saving...'}
              </p>
              <p className="text-sm text-gray-500">Please wait</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEdit ? `Edit ${postTypeData.singular_label}` : `Create New ${postTypeData.singular_label}`}
        </h1>
      </div>

      <form onSubmit={(e) => handleSubmit(e)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            {postTypeData?.supports?.title !== false && (
              <>
                <div className="mb-4">
                  <label htmlFor="post-title" className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    id="post-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter title"
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="post-slug" className="block text-sm font-medium text-gray-700 mb-2">
                    Slug *
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 overflow-hidden">
                      <span className="px-3 py-2 bg-gray-100 text-gray-600 text-sm font-mono border-r border-gray-300 whitespace-nowrap overflow-x-auto max-w-md">
                        {(() => {
                          const base = postTypeData?.slug ? `/${postTypeData.slug}` : '';
                          let datePrefix = '';
                          
                          switch (postTypeData?.url_structure) {
                            case 'year':
                              datePrefix = '/YYYY/';
                              break;
                            case 'year_month':
                              datePrefix = '/YYYY/MM/';
                              break;
                            case 'year_month_day':
                              datePrefix = '/YYYY/MM/DD/';
                              break;
                            default:
                              datePrefix = '/';
                          }
                          
                          // Add parent slugs for hierarchical types
                          let parentPath = '';
                          if (postTypeData?.hierarchical && parentId && allPostsData?.posts) {
                            const parentSlugs: string[] = [];
                            let currentParentId = parentId;
                            let iterations = 0;
                            
                            while (currentParentId && iterations < 10) {
                              const parent = allPostsData.posts.find((p: any) => p.id === currentParentId);
                              if (!parent) break;
                              parentSlugs.unshift(parent.slug);
                              currentParentId = parent.parent_id;
                              iterations++;
                            }
                            
                            if (parentSlugs.length > 0) {
                              parentPath = parentSlugs.join('/') + '/';
                            }
                          }
                          
                          return `${base}${datePrefix}${parentPath}`;
                        })()}
                      </span>
                      <input
                        id="post-slug"
                        type="text"
                        value={slug}
                        onChange={(e) => {
                          setSlug(e.target.value.toLowerCase().replace(/[^\w-]/g, '-').replace(/-+/g, '-'));
                          setSlugEdited(true);
                        }}
                        className="flex-1 px-4 py-2 border-0 focus:outline-none focus:ring-0 font-mono text-sm"
                        placeholder="auto-generated-from-title"
                        required
                      />
                    </div>
                    {status === 'published' && previewUrl && (
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        title="View published page"
                      >
                        🌐
                      </a>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {postTypeData?.hierarchical && parentId 
                      ? 'URL includes parent slugs. Only edit this page\'s slug portion.' 
                      : 'URL-friendly identifier. Auto-generated from title, or customize it.'
                    }
                  </p>
                </div>
              </>
            )}

            {postTypeData?.supports?.content === true && (
              <div>
                <div className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </div>
                <RichTextEditor value={content} onChange={setContent} />
              </div>
            )}
          </div>

          {postTypeData?.supports?.excerpt === true && (
            <div className="bg-white rounded-lg shadow p-6">
              <label htmlFor="post-excerpt" className="block text-sm font-medium text-gray-700 mb-2">
                Excerpt
              </label>
              <textarea
                id="post-excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Optional excerpt"
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          {postTypeData?.supports?.featured_image === true && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Featured Image</h3>
              
              {featuredImageUrl ? (
                <div className="space-y-3">
                  <img
                    src={featuredImageUrl}
                    alt="Featured"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowMediaModal(true)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFeaturedImageId(null);
                        setFeaturedImageUrl('');
                      }}
                      className="px-3 py-2 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMediaModal(true)}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors"
                >
                  Select Image
                </button>
              )}
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Publish</h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Status: <span className="font-medium">{status === 'published' ? 'Published' : 'Draft'}</span>
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Save as Draft
              </button>
              
              <button
                type="button"
                onClick={handlePublish}
                disabled={isSaving}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                Publish {postTypeData.singular_label}
              </button>
            </div>
          </div>

          {!!postTypeData?.hierarchical && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Page Attributes</h3>
              
              <div className="mb-4">
                <label htmlFor="post-parent" className="block text-sm font-medium text-gray-700 mb-2">
                  Parent
                </label>
                <select
                  id="post-parent"
                  value={parentId || ''}
                  onChange={(e) => setParentId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">No Parent (Top Level)</option>
                  {allPostsData?.posts
                    ?.filter((post: any) => !isEdit || post.id !== parseInt(postId || '0'))
                    .map((post: any) => (
                      <option key={post.id} value={post.id}>
                        {post.title}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="post-order" className="block text-sm font-medium text-gray-700 mb-2">
                  Order
                </label>
                <input
                  id="post-order"
                  type="number"
                  value={menuOrder}
                  onChange={(e) => setMenuOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="0"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Lower numbers appear first
                </p>
              </div>
            </div>
          )}

          {allTermsData && allTermsData.length > 0 && allTermsData.map((taxonomyData: any) => (
            <div key={taxonomyData.taxonomyId} className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">{taxonomyData.taxonomy.label}</h3>
              
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {taxonomyData.terms.map((term: any) => (
                  <label key={term.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={(selectedTerms[taxonomyData.taxonomyId] || []).includes(term.id)}
                      onChange={(e) => {
                        setSelectedTerms((prev) => {
                          const currentTerms = prev[taxonomyData.taxonomyId] || [];
                          const newTerms = e.target.checked
                            ? [...currentTerms, term.id]
                            : currentTerms.filter((id) => id !== term.id);
                          
                          return {
                            ...prev,
                            [taxonomyData.taxonomyId]: newTerms,
                          };
                        });
                      }}
                      className="mr-3 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{term.name}</span>
                  </label>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label htmlFor={`new-term-${taxonomyData.taxonomyId}`} className="block text-xs font-medium text-gray-700 mb-2">
                  Add New {taxonomyData.taxonomy.singular_label}
                </label>
                <div className="flex space-x-2">
                  <input
                    id={`new-term-${taxonomyData.taxonomyId}`}
                    type="text"
                    value={newTermName[taxonomyData.taxonomyId] || ''}
                    onChange={(e) => setNewTermName((prev) => ({
                      ...prev,
                      [taxonomyData.taxonomyId]: e.target.value,
                    }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateTerm(taxonomyData.taxonomyId);
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder={`New ${taxonomyData.taxonomy.singular_label.toLowerCase()} name`}
                    disabled={creatingTerm === taxonomyData.taxonomyId}
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateTerm(taxonomyData.taxonomyId)}
                    disabled={creatingTerm === taxonomyData.taxonomyId}
                    className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {creatingTerm === taxonomyData.taxonomyId ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </form>

      {postTypeData?.supports?.featured_image === true && (
        <MediaSelector
          isOpen={showMediaModal}
          onClose={() => setShowMediaModal(false)}
          onSelect={(id, url) => {
            setFeaturedImageId(id);
            setFeaturedImageUrl(url);
          }}
          currentMediaId={featuredImageId || undefined}
        />
      )}
    </div>
  );
}

