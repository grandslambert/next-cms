'use client';

interface ActivityLogDetailsModalProps {
  readonly isOpen: boolean;
  readonly log: any;
  readonly onClose: () => void;
}

export default function ActivityLogDetailsModal({
  isOpen,
  log,
  onClose,
}: ActivityLogDetailsModalProps) {
  if (!isOpen || !log) return null;

  // Parse JSON strings if needed
  const parseChanges = (changes: any) => {
    if (!changes) return null;
    if (typeof changes === 'string') {
      try {
        return JSON.parse(changes);
      } catch {
        return null;
      }
    }
    return changes;
  };

  const changesBefore = parseChanges(log.changes_before);
  const changesAfter = parseChanges(log.changes_after);

  const hasBefore = changesBefore && Object.keys(changesBefore).length > 0;
  const hasAfter = changesAfter && Object.keys(changesAfter).length > 0;
  const hasChanges = hasBefore || hasAfter;

  // Simple word-level diff highlighting
  const highlightDiff = (beforeText: string, afterText: string) => {
    if (!beforeText || !afterText || typeof beforeText !== 'string' || typeof afterText !== 'string') {
      return afterText;
    }

    // Split into words
    const beforeWords = beforeText.split(/(\s+)/);
    const afterWords = afterText.split(/(\s+)/);
    
    // Find added/changed words
    const result: JSX.Element[] = [];
    afterWords.forEach((word, idx) => {
      if (beforeWords[idx] !== word && word.trim() !== '') {
        // This word is different - highlight it
        result.push(
          <span key={idx} className="bg-yellow-200 px-1 rounded">
            {word}
          </span>
        );
      } else {
        result.push(<span key={idx}>{word}</span>);
      }
    });

    return <>{result}</>;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Activity Details</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(log.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <p className="text-sm text-gray-900">
                  {log.username} ({log.first_name} {log.last_name})
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <p className="text-sm text-gray-900 capitalize">
                  {log.action.split('_').join(' ')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
                <p className="text-sm text-gray-900 capitalize">{log.entity_type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entity</label>
                <p className="text-sm text-gray-900">{log.entity_name || 'N/A'}</p>
              </div>
              {log.ip_address && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                  <p className="text-sm text-gray-900">{log.ip_address}</p>
                </div>
              )}
            </div>

            {/* Details */}
            {log.details && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                  {log.details}
                </p>
              </div>
            )}

            {/* Changes */}
            {hasChanges && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Changes</h3>
                
                {/* Get all unique field keys */}
                {(() => {
                  const allKeys = new Set([
                    ...(hasBefore ? Object.keys(changesBefore) : []),
                    ...(hasAfter ? Object.keys(changesAfter) : [])
                  ]);
                  
                  return Array.from(allKeys).map((key) => {
                    const beforeValue = hasBefore ? changesBefore[key] : undefined;
                    const afterValue = hasAfter ? changesAfter[key] : undefined;
                    
                    // Only show if values are different
                    const isDifferent = JSON.stringify(beforeValue) !== JSON.stringify(afterValue);
                    if (!isDifferent && hasBefore && hasAfter) return null;

                    const formatValue = (value: any, isAfter: boolean = false) => {
                      if (value === null || value === undefined) return <span className="text-gray-400 italic">Empty</span>;
                      // Handle booleans (including MySQL TINYINT 0/1)
                      if (typeof value === 'boolean') return value ? 'True' : 'False';
                      if (value === 1 || value === 0) return value === 1 ? 'True' : 'False';
                      if (typeof value === 'object') return <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>;
                      
                      const stringValue = String(value);
                      
                      // For after values, highlight differences if we have before value
                      if (isAfter && beforeValue && typeof beforeValue === 'string' && typeof value === 'string') {
                        if (stringValue.length > 200) {
                          // Long content - scrollable with diff highlighting
                          return <div className="max-h-[200px] overflow-y-auto text-sm whitespace-pre-wrap">{highlightDiff(String(beforeValue), stringValue)}</div>;
                        }
                        return <div className="text-sm">{highlightDiff(String(beforeValue), stringValue)}</div>;
                      }
                      
                      // Regular display without highlighting
                      if (stringValue.length > 200) {
                        return <div className="max-h-[200px] overflow-y-auto text-sm whitespace-pre-wrap">{stringValue}</div>;
                      }
                      return <span className="text-sm">{stringValue}</span>;
                    };

                    return (
                      <div key={key} className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 capitalize">
                          {key.replace(/_/g, ' ')}
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          {/* Before */}
                          <div>
                            <div className="text-xs font-medium text-gray-600 mb-1">
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded">Before</span>
                            </div>
                            <div className="p-3 bg-red-50 border border-red-300 rounded-lg min-h-[50px]">
                              {formatValue(beforeValue, false)}
                            </div>
                          </div>

                          {/* After */}
                          <div>
                            <div className="text-xs font-medium text-gray-600 mb-1">
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">After</span>
                            </div>
                            <div className="p-3 bg-green-50 border border-green-300 rounded-lg min-h-[50px]">
                              {formatValue(afterValue, true)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {!hasChanges && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-gray-600 text-sm">No detailed change tracking for this action</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-4 bg-gray-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

