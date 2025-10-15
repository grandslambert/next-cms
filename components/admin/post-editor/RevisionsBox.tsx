'use client';

interface RevisionsBoxProps {
  readonly revisions: any[];
  readonly isLoading: boolean;
  readonly isPending: boolean;
  readonly onRestore: (revisionId: number) => void;
}

export default function RevisionsBox({
  revisions,
  isLoading,
  isPending,
  onRestore,
}: RevisionsBoxProps) {
  if (!revisions || revisions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Revisions</h3>
      
      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {revisions.map((revision: any) => (
            <div key={revision.id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{revision.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(revision.created_at).toLocaleString()} by {revision.author_name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRestore(revision.id)}
                  disabled={isPending}
                  className="ml-2 px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  Restore
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <p className="mt-4 text-xs text-gray-500">
        Showing {revisions.length} revision{revisions.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

