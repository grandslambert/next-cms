'use client';

interface PageAttributesBoxProps {
  readonly isHierarchical: boolean;
  readonly canReassign: boolean;
  readonly isEdit: boolean;
  readonly authorId: number | null;
  readonly parentId: number | null;
  readonly menuOrder: number;
  readonly allPosts: any[];
  readonly currentPostId?: string;
  readonly users: any[];
  readonly onAuthorChange: (authorId: number | null) => void;
  readonly onParentChange: (parentId: number | null) => void;
  readonly onMenuOrderChange: (order: number) => void;
}

export default function PageAttributesBox({
  isHierarchical,
  canReassign,
  isEdit,
  authorId,
  parentId,
  menuOrder,
  allPosts,
  currentPostId,
  users,
  onAuthorChange,
  onParentChange,
  onMenuOrderChange,
}: PageAttributesBoxProps) {
  if (!isHierarchical && !canReassign) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Page Attributes</h3>
      
      {canReassign && isEdit && (
        <div className="mb-4">
          <label htmlFor="post-author" className="block text-sm font-medium text-gray-700 mb-2">
            Author
          </label>
          <select
            id="post-author"
            value={authorId || ''}
            onChange={(e) => onAuthorChange(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {users?.map((user: any) => (
              <option key={user.id} value={user.id}>
                {user.first_name} {user.last_name} ({user.email})
              </option>
            ))}
          </select>
        </div>
      )}

      {isHierarchical && (
        <>
          <div className="mb-4">
            <label htmlFor="post-parent" className="block text-sm font-medium text-gray-700 mb-2">
              Parent
            </label>
            <select
              id="post-parent"
              value={parentId || ''}
              onChange={(e) => onParentChange(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">No Parent (Top Level)</option>
              {allPosts
                ?.filter((post: any) => !isEdit || post.id !== parseInt(currentPostId || '0'))
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
              onChange={(e) => onMenuOrderChange(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              min="0"
            />
            <p className="mt-1 text-xs text-gray-500">
              Lower numbers appear first
            </p>
          </div>
        </>
      )}
    </div>
  );
}

