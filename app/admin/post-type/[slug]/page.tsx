'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';

interface Post {
  id: number;
  post_type: string;
  title: string;
  status: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export default function PostTypePage() {
  const params = useParams();
  const postTypeSlug = params?.slug as string;
  const queryClient = useQueryClient();

  // Fetch post type info
  const { data: postTypeData } = useQuery({
    queryKey: ['post-type', postTypeSlug],
    queryFn: async () => {
      const res = await axios.get('/api/post-types');
      const postType = res.data.postTypes.find((pt: any) => pt.name === postTypeSlug);
      return postType;
    },
  });

  // Fetch posts of this type
  const { data, isLoading } = useQuery({
    queryKey: ['posts', postTypeSlug],
    queryFn: async () => {
      const res = await axios.get(`/api/posts?post_type=${postTypeSlug}`);
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`/api/posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', postTypeSlug] });
      toast.success(`${postTypeData?.singular_label || 'Item'} deleted successfully`);
    },
    onError: () => {
      toast.error(`Failed to delete ${postTypeData?.singular_label?.toLowerCase() || 'item'}`);
    },
  });

  const handleDelete = (id: number, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  // Build hierarchical tree for display
  const buildHierarchy = (posts: Post[], parentId: number | null = null, level: number = 0): any[] => {
    const children: any[] = [];
    
    posts
      .filter((post: any) => (post.parent_id || null) === parentId)
      .sort((a: any, b: any) => (a.menu_order || 0) - (b.menu_order || 0))
      .forEach(post => {
        children.push({ ...post, level });
        children.push(...buildHierarchy(posts, post.id, level + 1));
      });
    
    return children;
  };

  // Get posts in hierarchical order if needed
  const displayPosts = postTypeData?.hierarchical && data?.posts 
    ? buildHierarchy(data.posts)
    : data?.posts || [];

  if (!postTypeData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{postTypeData.label}</h1>
          <p className="text-gray-600 mt-2">{postTypeData.description}</p>
        </div>
        <Link
          href={`/admin/post-type/${postTypeSlug}/new`}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          + Add New {postTypeData.singular_label}
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : data?.posts && data.posts.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayPosts.map((post: any) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    <Link
                      href={`/admin/post-type/${postTypeSlug}/${post.id}`}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      Edit
                    </Link>
                    {post.status === 'published' && (
                      <Link
                        href={postTypeSlug === 'post' ? `/blog/${post.slug}` : `/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-900"
                      >
                        View
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(post.id, post.title)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/admin/post-type/${postTypeSlug}/${post.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-primary-600 flex items-center"
                    >
                      {!!postTypeData.hierarchical && post.level > 0 && (
                        <span className="text-gray-400 mr-2">
                          {'—'.repeat(post.level)} 
                        </span>
                      )}
                      <span>{post.title}</span>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{post.author_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        post.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : post.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {post.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(post.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-4">No {postTypeData.label.toLowerCase()} yet</p>
            <Link
              href={`/admin/post-type/${postTypeSlug}/new`}
              className="text-primary-600 hover:text-primary-700"
            >
              Create your first {postTypeData.singular_label.toLowerCase()}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

