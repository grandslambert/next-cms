'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import RichTextEditor from '@/components/admin/RichTextEditor';
import MediaSelector from '@/components/admin/MediaSelector';
import FeaturedImageBox from '@/components/admin/post-editor/FeaturedImageBox';
import PageAttributesBox from '@/components/admin/post-editor/PageAttributesBox';
import CustomFieldsBox from '@/components/admin/post-editor/CustomFieldsBox';
import TaxonomyBox from '@/components/admin/post-editor/TaxonomyBox';
import RevisionsBox from '@/components/admin/post-editor/RevisionsBox';
import AutosaveDiffModal from '@/components/admin/post-editor/AutosaveDiffModal';
import SeoMetadataBox from '@/components/admin/post-editor/SeoMetadataBox';

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
  const { data: session, status: sessionStatus } = useSession();
  const queryClient = useQueryClient();
  const permissions = (session?.user as any)?.permissions || {};
  
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [status, setStatus] = useState('draft');
  const [authorId, setAuthorId] = useState<number | null>(null);
  const [parentId, setParentId] = useState<number | null>(null);
  const [menuOrder, setMenuOrder] = useState(0);
  const [selectedTerms, setSelectedTerms] = useState<{[taxonomyId: string]: number[]}>({});
  const [featuredImageId, setFeaturedImageId] = useState<number | null>(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [customFields, setCustomFields] = useState<Array<{meta_key: string, meta_value: string}>>([]);
  const [scheduledPublishAt, setScheduledPublishAt] = useState<string>('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showAutosaveDiff, setShowAutosaveDiff] = useState(false);
  const [autosaveData, setAutosaveData] = useState<any>(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [autosaveSystemReady, setAutosaveSystemReady] = useState(false);
  const [autosaveTimerRef, setAutosaveTimerRef] = useState<NodeJS.Timeout | null>(null);
  const [checkingAutosave, setCheckingAutosave] = useState(false);

  // Check permission for this specific post type
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.push('/admin/login');
      return;
    }
    // Check for specific permission OR manage_posts_all
    const hasPermission = permissions[`manage_posts_${postTypeSlug}`] || permissions.manage_posts_all;
    if (!hasPermission) {
      router.push('/admin');
    }
  }, [session, sessionStatus, permissions, postTypeSlug, router]);

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

  // Fetch users for author reassignment
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await axios.get('/api/users');
      return res.data;
    },
    enabled: permissions.can_reassign === true,
  });

  // Fetch revisions for this post (edit mode only)
  const { data: revisionsData, isLoading: revisionsLoading } = useQuery({
    queryKey: ['post-revisions', postId],
    queryFn: async () => {
      const res = await axios.get(`/api/posts/${postId}/revisions`);
      return res.data;
    },
    enabled: isEdit && !!postId,
  });

  // Fetch custom fields for this post (edit mode only)
  const { data: customFieldsData } = useQuery({
    queryKey: ['post-meta', postId],
    queryFn: async () => {
      const res = await axios.get(`/api/posts/${postId}/meta`);
      return res.data;
    },
    enabled: isEdit && !!postId,
  });

  // Load custom fields and SEO data when data is fetched
  useEffect(() => {
    if (customFieldsData?.meta) {
      const fields = customFieldsData.meta;
      
      // Separate SEO fields from regular custom fields
      const seoFields: Record<string, string> = {};
      const regularFields: Array<{meta_key: string, meta_value: string}> = [];
      
      fields.forEach((field: any) => {
        if (field.meta_key === '_seo_title') {
          seoFields.title = field.meta_value;
        } else if (field.meta_key === '_seo_description') {
          seoFields.description = field.meta_value;
        } else if (field.meta_key === '_seo_keywords') {
          seoFields.keywords = field.meta_value;
        } else {
          regularFields.push({
            meta_key: field.meta_key,
            meta_value: field.meta_value
          });
        }
      });
      
      // Set SEO fields
      setSeoTitle(seoFields.title || '');
      setSeoDescription(seoFields.description || '');
      setSeoKeywords(seoFields.keywords || '');
      
      // Set regular custom fields
      setCustomFields(regularFields);
    }
  }, [customFieldsData]);

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

  // Check if user can edit this post
  useEffect(() => {
    if (isEdit && data?.post && sessionStatus === 'authenticated') {
      const postAuthorId = data.post.author_id;
      const currentUserId = parseInt((session.user as any)?.id);
      const canManageOthers = permissions.manage_others_posts === true;
      
      // If not owner and can't manage others, redirect
      if (postAuthorId !== currentUserId && !canManageOthers) {
        toast.error('You can only edit your own posts');
        router.push(`/admin/post-type/${postTypeSlug}`);
      }
    }
  }, [isEdit, data?.post, session, sessionStatus, permissions, postTypeSlug, router]);

  // Load post data
  useEffect(() => {
    if (data?.post) {
      setTitle(data.post.title || '');
      setSlug(data.post.slug || '');
      setContent(data.post.content || '');
      setExcerpt(data.post.excerpt || '');
      setStatus(data.post.status || 'draft');
      setAuthorId(data.post.author_id || null);
      setParentId(data.post.parent_id || null);
      setMenuOrder(data.post.menu_order || 0);
      setFeaturedImageId(data.post.featured_image_id || null);
      setFeaturedImageUrl(data.post.featured_image_url || '');
      setSlugEdited(true); // Existing posts already have a slug
      
      // Load scheduled publish date if exists
      if (data.post.scheduled_publish_at) {
        const date = new Date(data.post.scheduled_publish_at);
        // Format for datetime-local input: YYYY-MM-DDThh:mm
        const formatted = date.toISOString().slice(0, 16);
        setScheduledPublishAt(formatted);
      }
      
      // Mark that initial post data has loaded
      setInitialDataLoaded(true);
    } else if (!isEdit) {
      // For new posts, mark as loaded immediately
      setInitialDataLoaded(true);
    }
  }, [data, isEdit]);

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
      const termsByTaxonomy: {[taxonomyId: string]: number[]} = {};
      
      // Create a map of taxonomy name to taxonomy ID
      const taxonomyNameToId: {[name: string]: string} = {};
      allTermsData.forEach((taxonomyData: any) => {
        if (taxonomyData.taxonomy?.name) {
          taxonomyNameToId[taxonomyData.taxonomy.name] = taxonomyData.taxonomyId;
        }
      });
      
      postTermsData.terms.forEach((term: any) => {
        const taxonomyId = taxonomyNameToId[term.taxonomy_name];
        if (taxonomyId) {
          if (!termsByTaxonomy[taxonomyId]) {
            termsByTaxonomy[taxonomyId] = [];
          }
          termsByTaxonomy[taxonomyId].push(term.id);
        }
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

  // Load autosaved content - runs FIRST before anything else
  useEffect(() => {
    if (autosaveSystemReady) return; // Only run once
    if (sessionStatus !== 'authenticated') return;
    if (!initialDataLoaded) return; // Wait for post data to load first
    
    const loadAutosave = async () => {
      setCheckingAutosave(true);
      const params = new URLSearchParams({
        post_type: postTypeSlug,
        ...(postId && { post_id: postId })
      });

      try {
        const res = await axios.get(`/api/posts/autosave?${params}`);
        if (res.data.autosave) {
          const autosave = res.data.autosave;
          
          // Check if autosave has content
          if (autosave.title || autosave.content || autosave.excerpt) {
            // Check if autosave is recent (within last 24 hours) if saved_at exists
            let showAutosave = true;
            if (autosave.saved_at) {
              const savedDate = new Date(autosave.saved_at);
              const hoursSinceSave = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60);
              showAutosave = hoursSinceSave < 24;
            }
            
            if (showAutosave) {
              // Show the diff - but DON'T set autosaveSystemReady yet
              // User must make a choice first
              setAutosaveData(autosave);
              setShowAutosaveDiff(true);
              setCheckingAutosave(false);
              return; // Exit without setting autosaveSystemReady
            }
          }
        }
        // If no autosave or it's too old, system is ready
        setAutosaveSystemReady(true);
        setCheckingAutosave(false);
      } catch (error) {
        // On error, allow autosave to work
        setAutosaveSystemReady(true);
        setCheckingAutosave(false);
      }
    };

    loadAutosave();
  }, [sessionStatus, postTypeSlug, postId, initialDataLoaded, autosaveSystemReady]);

  // Manual autosave trigger function
  const triggerAutosave = (overrides?: {
    parent_id?: number | null;
    menu_order?: number;
    author_id?: number;
    featured_image_id?: number | null;
    featured_image_url?: string;
    selected_terms?: {[taxonomyId: string]: number[]};
    title?: string;
    content?: string;
    excerpt?: string;
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string;
  }) => {
    // CRITICAL CHECK - autosave system must be ready (old autosave dealt with, data loaded)
    if (!autosaveSystemReady) return;
    
    const currentTitle = overrides?.title !== undefined ? overrides.title : title;
    const currentContent = overrides?.content !== undefined ? overrides.content : content;
    const currentExcerpt = overrides?.excerpt !== undefined ? overrides.excerpt : excerpt;
    
    if (!currentTitle && !currentContent && !currentExcerpt) return; // Don't autosave empty content
    
    // Clear existing timer
    if (autosaveTimerRef) {
      clearTimeout(autosaveTimerRef);
    }

    // Set new timer
    const timer = setTimeout(() => {
      setAutosaveStatus('saving');
      autosaveMutation.mutate({
        post_id: postId || null,
        post_type: postTypeSlug,
        title: currentTitle,
        content: currentContent,
        excerpt: currentExcerpt,
        custom_fields: customFields,
        parent_id: overrides?.parent_id !== undefined ? overrides.parent_id : parentId,
        menu_order: overrides?.menu_order !== undefined ? overrides.menu_order : menuOrder,
        author_id: overrides?.author_id !== undefined ? overrides.author_id : authorId,
        featured_image_id: overrides?.featured_image_id !== undefined ? overrides.featured_image_id : featuredImageId,
        featured_image_url: overrides?.featured_image_url !== undefined ? overrides.featured_image_url : featuredImageUrl,
        selected_terms: overrides?.selected_terms !== undefined ? overrides.selected_terms : selectedTerms,
        seo_title: overrides?.seo_title !== undefined ? overrides.seo_title : seoTitle,
        seo_description: overrides?.seo_description !== undefined ? overrides.seo_description : seoDescription,
        seo_keywords: overrides?.seo_keywords !== undefined ? overrides.seo_keywords : seoKeywords,
      });
    }, 3000);

    setAutosaveTimerRef(timer);
  };

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

      // Save custom fields (including SEO fields)
      const allMeta = [
        ...customFields.filter(cf => cf.meta_key.trim() !== ''),
        // Add SEO fields with underscore prefix
        ...(seoTitle ? [{ meta_key: '_seo_title', meta_value: seoTitle }] : []),
        ...(seoDescription ? [{ meta_key: '_seo_description', meta_value: seoDescription }] : []),
        ...(seoKeywords ? [{ meta_key: '_seo_keywords', meta_value: seoKeywords }] : []),
      ];
      if (allMeta.length > 0) {
        await axios.put(`/api/posts/${newPostId}/meta`, { meta: allMeta });
      }

      return { ...res.data, newPostId };
    },
    onSuccess: async (data) => {
      const message = data.post.status === 'published' 
        ? `${postTypeData?.singular_label || 'Item'} published successfully!`
        : `${postTypeData?.singular_label || 'Item'} saved as draft`;
      
      // Clear autosave after successful save
      try {
        const params = new URLSearchParams({
          post_type: postTypeSlug,
        });
        await axios.delete(`/api/posts/autosave?${params}`);
      } catch (error) {
        // Silently fail
      }
      
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

      // Update custom fields (including SEO fields)
      const allMeta = [
        ...customFields.filter(cf => cf.meta_key.trim() !== ''),
        // Add SEO fields with underscore prefix
        ...(seoTitle ? [{ meta_key: '_seo_title', meta_value: seoTitle }] : []),
        ...(seoDescription ? [{ meta_key: '_seo_description', meta_value: seoDescription }] : []),
        ...(seoKeywords ? [{ meta_key: '_seo_keywords', meta_value: seoKeywords }] : []),
      ];
      await axios.put(`/api/posts/${postId}/meta`, { meta: allMeta });
      
      return res.data;
    },
    onSuccess: async (data) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts', postTypeSlug] });
      queryClient.invalidateQueries({ queryKey: ['post-terms', postId] });
      queryClient.invalidateQueries({ queryKey: ['post-revisions', postId] });
      queryClient.invalidateQueries({ queryKey: ['post-meta', postId] });
      
      const message = data.post?.status === 'published' 
        ? `${postTypeData?.singular_label || 'Item'} published successfully!`
        : `${postTypeData?.singular_label || 'Item'} updated successfully`;
      
      // Clear autosave after successful save
      try {
        const params = new URLSearchParams({
          post_type: postTypeSlug,
          post_id: postId || ''
        });
        await axios.delete(`/api/posts/autosave?${params}`);
      } catch (error) {
        // Silently fail
      }
      
      // Update local state immediately
      if (data.post) {
        setTitle(data.post.title || '');
        setSlug(data.post.slug || '');
        setSlugEdited(true); // Mark as edited so auto-generation stops
        setContent(data.post.content || '');
        setExcerpt(data.post.excerpt || '');
        setStatus(data.post.status || 'draft');
        setAuthorId(data.post.author_id || null);
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

  const autosaveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await axios.post('/api/posts/autosave', data);
      return res.data;
    },
    onSuccess: (data) => {
      setAutosaveStatus('saved');
      setLastSaved(new Date(data.saved_at));
      setTimeout(() => setAutosaveStatus('idle'), 2000);
    },
    onError: () => {
      setAutosaveStatus('idle');
    },
  });

  const restoreRevisionMutation = useMutation({
    mutationFn: async (revisionId: number) => {
      const res = await axios.post(`/api/posts/${postId}/revisions/${revisionId}/restore`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['post-revisions', postId] });
      queryClient.invalidateQueries({ queryKey: ['post-meta', postId] });
      
      // Update local state with restored content
      if (data.post) {
        setTitle(data.post.title || '');
        setContent(data.post.content || '');
        setExcerpt(data.post.excerpt || '');
      }
      
      toast.success('Revision restored successfully');
    },
    onError: () => {
      toast.error('Failed to restore revision');
    },
  });

  const handleRestoreRevision = (revisionId: number) => {
    if (confirm('Are you sure you want to restore this revision? Your current changes will be saved as a new revision.')) {
      restoreRevisionMutation.mutate(revisionId);
    }
  };

  const handleAddCustomField = () => {
    setCustomFields([...customFields, { meta_key: '', meta_value: '' }]);
    triggerAutosave();
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
    triggerAutosave();
  };

  const handleCustomFieldChange = (index: number, field: 'meta_key' | 'meta_value', value: string) => {
    const updated = [...customFields];
    // Replace spaces with underscores and convert to lowercase in field names
    if (field === 'meta_key') {
      updated[index][field] = value.toLowerCase().replace(/\s+/g, '_');
    } else {
      updated[index][field] = value;
    }
    setCustomFields(updated);
    triggerAutosave();
  };

  const handleAuthorChange = (value: number | null) => {
    setAuthorId(value);
    if (value !== null) {
      triggerAutosave({ author_id: value });
    }
  };

  const handleParentChange = (value: number | null) => {
    setParentId(value);
    triggerAutosave({ parent_id: value });
  };

  const handleMenuOrderChange = (value: number) => {
    setMenuOrder(value);
    triggerAutosave({ menu_order: value });
  };

  const handleSeoTitleChange = (value: string) => {
    setSeoTitle(value);
    triggerAutosave({ seo_title: value });
  };

  const handleSeoDescriptionChange = (value: string) => {
    setSeoDescription(value);
    triggerAutosave({ seo_description: value });
  };

  const handleSeoKeywordsChange = (value: string) => {
    setSeoKeywords(value);
    triggerAutosave({ seo_keywords: value });
  };

  const handleUseAutosave = () => {
    if (autosaveData) {
      setTitle(autosaveData.title || '');
      setContent(autosaveData.content || '');
      setExcerpt(autosaveData.excerpt || '');
      if (autosaveData.custom_fields) {
        setCustomFields(autosaveData.custom_fields);
      }
      if (autosaveData.parent_id !== undefined) {
        setParentId(autosaveData.parent_id);
      }
      if (autosaveData.menu_order !== undefined) {
        setMenuOrder(autosaveData.menu_order);
      }
      if (autosaveData.author_id !== undefined) {
        setAuthorId(autosaveData.author_id);
      }
      if (autosaveData.featured_image_id !== undefined) {
        setFeaturedImageId(autosaveData.featured_image_id);
      }
      if (autosaveData.featured_image_url !== undefined) {
        setFeaturedImageUrl(autosaveData.featured_image_url);
      }
      if (autosaveData.selected_terms !== undefined) {
        setSelectedTerms(autosaveData.selected_terms);
      }
      if (autosaveData.seo_title !== undefined) {
        setSeoTitle(autosaveData.seo_title);
      }
      if (autosaveData.seo_description !== undefined) {
        setSeoDescription(autosaveData.seo_description);
      }
      if (autosaveData.seo_keywords !== undefined) {
        setSeoKeywords(autosaveData.seo_keywords);
      }
      setShowAutosaveDiff(false);
      setAutosaveData(null);
      toast.success('Autosaved content restored');
      
      // NOW the autosave system is ready
      setAutosaveSystemReady(true);
    }
  };

  const handleKeepCurrent = async () => {
    setShowAutosaveDiff(false);
    setAutosaveData(null);
    
    // Clear the autosave since user chose to keep current
    try {
      const params = new URLSearchParams({
        post_type: postTypeSlug,
        ...(postId && { post_id: postId })
      });
      await axios.delete(`/api/posts/autosave?${params}`);
    } catch (error) {
      // Silently fail  
    }
    
    // NOW the autosave system is ready
    setAutosaveSystemReady(true);
  };

  // Cleanup autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef) {
        clearTimeout(autosaveTimerRef);
      }
    };
  }, [autosaveTimerRef]);

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
    
    // Include author_id if it's being changed
    if (authorId && permissions.can_reassign) {
      data.author_id = authorId;
    }

    // Include scheduled_publish_at if status is scheduled
    if (finalStatus === 'scheduled') {
      if (!scheduledPublishAt) {
        toast.error('Please select a scheduled publish date/time', { duration: 3000 });
        return;
      }
      data.scheduled_publish_at = scheduledPublishAt;
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

  const handleSubmitForReview = (e: React.FormEvent) => {
    handleSubmit(e, 'pending');
  };

  const handleSchedule = (e: React.FormEvent) => {
    handleSubmit(e, 'scheduled');
  };

  if (sessionStatus === 'loading' || isLoading || !postTypeData) {
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
    <div className="-m-8 h-[calc(100vh-4rem)]">
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

      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? `Edit ${postTypeData.singular_label}` : `Create New ${postTypeData.singular_label}`}
            </h1>
            {/* Autosave Indicator */}
            {autosaveStatus === 'saving' && (
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                Saving...
              </span>
            )}
            {autosaveStatus === 'saved' && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                ✓ Draft saved
              </span>
            )}
            {lastSaved && autosaveStatus === 'idle' && (
              <span className="text-xs text-gray-400">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>
            
            {permissions.can_publish ? (
              <>
                {scheduledPublishAt ? (
                  <button
                    type="button"
                    onClick={handleSchedule}
                    disabled={isSaving}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    Schedule {postTypeData.singular_label}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {isEdit && status === 'published' ? 'Update' : 'Publish'} {postTypeData.singular_label}
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={handleSubmitForReview}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Submit for Review
              </button>
            )}
            
            {isEdit && (
              <Link
                href={`/admin/post-type/${postTypeSlug}/new`}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                + Add New
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto h-[calc(100vh-8rem)]">
        <div className="px-8 py-6">

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
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setTitle(newValue);
                      triggerAutosave({ title: newValue });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter title"
                    required
                    autoFocus={!isEdit}
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
                <RichTextEditor 
                  value={content} 
                  onChange={(value) => {
                    setContent(value);
                    triggerAutosave({ content: value });
                  }}
                />
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
                onChange={(e) => {
                  const newValue = e.target.value;
                  setExcerpt(newValue);
                  triggerAutosave({ excerpt: newValue });
                }}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Optional excerpt"
              />
            </div>
          )}

          {postTypeData?.supports?.custom_fields === true && (
            <CustomFieldsBox
              customFields={customFields}
              onAddField={handleAddCustomField}
              onRemoveField={handleRemoveCustomField}
              onFieldChange={handleCustomFieldChange}
            />
          )}

          {/* SEO Metadata */}
          <SeoMetadataBox
            seoTitle={seoTitle}
            seoDescription={seoDescription}
            seoKeywords={seoKeywords}
            onSeoTitleChange={handleSeoTitleChange}
            onSeoDescriptionChange={handleSeoDescriptionChange}
            onSeoKeywordsChange={handleSeoKeywordsChange}
          />
        </div>

        <div className="space-y-6">
          {postTypeData?.supports?.featured_image === true && (
            <FeaturedImageBox
              featuredImageUrl={featuredImageUrl}
              onSelectImage={() => setShowMediaModal(true)}
              onRemoveImage={() => {
                setFeaturedImageId(null);
                setFeaturedImageUrl('');
                triggerAutosave({ featured_image_id: null, featured_image_url: '' });
              }}
            />
          )}

          {/* Status & Schedule Box */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Status</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Current Status: <span className="font-medium">
                  {status === 'published' ? 'Published' : 
                   status === 'pending' ? 'Pending Review' : 
                   status === 'scheduled' ? 'Scheduled' : 
                   'Draft'}
                </span>
              </p>
              {status === 'scheduled' && data?.post?.scheduled_publish_at && (
                <p className="text-xs text-gray-500 mt-1">
                  Scheduled for: {new Date(data.post.scheduled_publish_at).toLocaleString()}
                </p>
              )}
            </div>

            {permissions.can_publish && (
              <div>
                <label htmlFor="scheduled-publish" className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Publish
                </label>
                <input
                  id="scheduled-publish"
                  type="datetime-local"
                  value={scheduledPublishAt}
                  onChange={(e) => setScheduledPublishAt(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for immediate publish
                </p>
              </div>
            )}
          </div>

          <PageAttributesBox
            isHierarchical={!!postTypeData?.hierarchical}
            canReassign={permissions.can_reassign === true}
            isEdit={isEdit}
            authorId={authorId}
            parentId={parentId}
            menuOrder={menuOrder}
            allPosts={allPostsData?.posts || []}
            currentPostId={postId}
            users={usersData?.users || []}
            onAuthorChange={handleAuthorChange}
            onParentChange={handleParentChange}
            onMenuOrderChange={handleMenuOrderChange}
          />

          {allTermsData && allTermsData.length > 0 && allTermsData.map((taxonomyData: any) => (
            <TaxonomyBox
              key={taxonomyData.taxonomyId}
              taxonomy={taxonomyData.taxonomy}
              terms={taxonomyData.terms}
              selectedTerms={selectedTerms[taxonomyData.taxonomyId] || []}
              onTermsChange={(termIds) => {
                const newSelectedTerms = { ...selectedTerms, [taxonomyData.taxonomyId]: termIds };
                setSelectedTerms(newSelectedTerms);
                triggerAutosave({ selected_terms: newSelectedTerms });
              }}
              onTermAdded={() => queryClient.invalidateQueries({ queryKey: ['all-terms'] })}
            />
          ))}

          {isEdit && (
            <RevisionsBox
              revisions={revisionsData?.revisions || []}
              isLoading={revisionsLoading}
              isPending={restoreRevisionMutation.isPending}
              onRestore={handleRestoreRevision}
            />
          )}
        </div>
      </form>

      {postTypeData?.supports?.featured_image === true && (
        <MediaSelector
          isOpen={showMediaModal}
          onClose={() => setShowMediaModal(false)}
          onSelect={(id, url) => {
            setFeaturedImageId(id);
            setFeaturedImageUrl(url);
            triggerAutosave({ featured_image_id: id, featured_image_url: url });
          }}
          currentMediaId={featuredImageId || undefined}
        />
      )}

      {/* Autosave Diff Modal */}
      <AutosaveDiffModal
        isOpen={showAutosaveDiff}
        currentContent={{ 
          title, 
          content, 
          excerpt, 
          custom_fields: customFields,
          parent_id: parentId,
          menu_order: menuOrder,
          author_id: authorId || 0,
          featured_image_id: featuredImageId,
          featured_image_url: featuredImageUrl,
          selected_terms: selectedTerms,
          seo_title: seoTitle,
          seo_description: seoDescription,
          seo_keywords: seoKeywords
        }}
        autosaveContent={autosaveData || { 
          title: '', 
          content: '', 
          excerpt: '', 
          custom_fields: [], 
          saved_at: '' 
        }}
        allPosts={allPostsData?.posts || []}
        users={usersData?.users || []}
        allTerms={allTermsData || []}
        onUseCurrent={handleKeepCurrent}
        onUseAutosave={handleUseAutosave}
      />

      {/* Loading Overlay for Autosave Check */}
      {checkingAutosave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-lg font-medium text-gray-900">Checking for autosaved draft...</p>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

