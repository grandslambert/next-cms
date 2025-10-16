interface AutosaveDiffModalProps {
  readonly isOpen: boolean;
  readonly currentContent: {
    title: string;
    content: string;
    excerpt: string;
    custom_fields: Array<{meta_key: string, meta_value: string}>;
    parent_id: number | null;
    menu_order: number;
    author_id: number;
    seo_title: string;
    seo_description: string;
    seo_keywords: string;
  };
  readonly autosaveContent: {
    title: string;
    content: string;
    excerpt: string;
    custom_fields?: Array<{meta_key: string, meta_value: string}>;
    parent_id?: number | null;
    menu_order?: number;
    author_id?: number;
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string;
    saved_at: string;
  };
  readonly allPosts?: Array<{id: number, title: string}>;
  readonly users?: Array<{id: number, name: string}>;
  readonly onUseCurrent: () => void;
  readonly onUseAutosave: () => void;
}

export default function AutosaveDiffModal({
  isOpen,
  currentContent,
  autosaveContent,
  allPosts = [],
  users = [],
  onUseCurrent,
  onUseAutosave,
}: AutosaveDiffModalProps) {
  if (!isOpen) return null;

  const savedDate = new Date(autosaveContent.saved_at);

  // Compare custom fields
  const currentFieldsStr = JSON.stringify(currentContent.custom_fields || []);
  const autosaveFieldsStr = JSON.stringify(autosaveContent.custom_fields || []);
  const customFieldsChanged = currentFieldsStr !== autosaveFieldsStr;

  // Compare page attributes
  const parentChanged = currentContent.parent_id !== (autosaveContent.parent_id ?? currentContent.parent_id);
  const menuOrderChanged = currentContent.menu_order !== (autosaveContent.menu_order ?? currentContent.menu_order);
  const authorChanged = currentContent.author_id !== (autosaveContent.author_id ?? currentContent.author_id);
  const pageAttributesChanged = parentChanged || menuOrderChanged || authorChanged;

  // Compare SEO fields
  const seoTitleChanged = currentContent.seo_title !== (autosaveContent.seo_title ?? currentContent.seo_title);
  const seoDescriptionChanged = currentContent.seo_description !== (autosaveContent.seo_description ?? currentContent.seo_description);
  const seoKeywordsChanged = currentContent.seo_keywords !== (autosaveContent.seo_keywords ?? currentContent.seo_keywords);
  const seoMetadataChanged = seoTitleChanged || seoDescriptionChanged || seoKeywordsChanged;

  const hasChanges = 
    currentContent.title !== autosaveContent.title ||
    currentContent.content !== autosaveContent.content ||
    currentContent.excerpt !== autosaveContent.excerpt ||
    customFieldsChanged ||
    pageAttributesChanged ||
    seoMetadataChanged;

  // Helper functions to get names
  const getParentTitle = (parentId: number | null) => {
    if (!parentId) return 'None';
    const parent = allPosts.find(p => p.id === parentId);
    return parent?.title || `ID: ${parentId}`;
  };

  const getAuthorName = (authorId: number) => {
    const author = users.find(u => u.id === authorId);
    return author?.name || `ID: ${authorId}`;
  };

  // HTML-aware diff that preserves formatting and adds highlighting
  const highlightHtmlDiff = (beforeHtml: string, afterHtml: string) => {
    if (!beforeHtml || !afterHtml) return afterHtml;

    // Parse HTML into DOM
    const beforeDiv = document.createElement('div');
    const afterDiv = document.createElement('div');
    beforeDiv.innerHTML = beforeHtml;
    afterDiv.innerHTML = afterHtml;

    // Get text content for word-level comparison
    const beforeText = beforeDiv.textContent || '';
    
    // Build a set of words from the before text for fast lookup
    const beforeWords = new Set(beforeText.split(/\s+/).filter(w => w.length > 0));

    // Walk through the after DOM and highlight text nodes
    const highlightTextNodes = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (!text.trim()) return; // Skip whitespace-only nodes

        const words = text.split(/(\s+)/);
        const hasChanges = words.some(word => word.trim() && !beforeWords.has(word.trim()));

        if (hasChanges) {
          // Create a wrapper for this text node
          const wrapper = document.createElement('span');
          
          for (const word of words) {
            if (!word.trim()) {
              // Preserve whitespace
              wrapper.appendChild(document.createTextNode(word));
            } else if (!beforeWords.has(word.trim())) {
              // Highlight changed/new words
              const highlight = document.createElement('mark');
              highlight.className = 'bg-yellow-200 px-0.5';
              highlight.textContent = word;
              wrapper.appendChild(highlight);
            } else {
              // Keep unchanged words as is
              wrapper.appendChild(document.createTextNode(word));
            }
          }

          // Replace the text node with our wrapper
          node.parentNode?.replaceChild(wrapper, node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Recursively process child nodes
        const children = Array.from(node.childNodes);
        for (const child of children) {
          highlightTextNodes(child);
        }
      }
    };

    highlightTextNodes(afterDiv);
    return afterDiv.innerHTML;
  };

  // Word-level diff highlighting for plain text
  const highlightTextDiff = (beforeText: string, afterText: string) => {
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
      {/* Backdrop - no click handler, modal must be decided */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">Autosaved Draft Found</h2>
            <p className="text-sm text-gray-600 mt-1">
              Found autosaved content from <span className="font-medium">{savedDate.toLocaleString()}</span>
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {!hasChanges ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-blue-800">
                  The autosaved content is identical to the current content. No differences found.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Title Diff */}
                {currentContent.title !== autosaveContent.title && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Title</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">Current</span>
                        </div>
                        <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg min-h-[60px]">
                          <p className="text-sm text-gray-900">{currentContent.title || <span className="text-gray-400 italic">Empty</span>}</p>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Autosaved (with changes highlighted)</span>
                        </div>
                        <div className="p-4 bg-green-50 border border-green-300 rounded-lg min-h-[60px]">
                          <p className="text-sm text-gray-900">
                            {autosaveContent.title ? highlightTextDiff(currentContent.title || '', autosaveContent.title) : <span className="text-gray-400 italic">Empty</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Diff */}
                {currentContent.content !== autosaveContent.content && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Content</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">Current</span>
                        </div>
                        <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg min-h-[100px] max-h-[300px] overflow-y-auto">
                          <div className="text-sm text-gray-900 content-body" dangerouslySetInnerHTML={{ __html: currentContent.content || '<span class="text-gray-400 italic">Empty</span>' }} />
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Autosaved (with changes highlighted)</span>
                        </div>
                        <div className="p-4 bg-green-50 border border-green-300 rounded-lg min-h-[100px] max-h-[300px] overflow-y-auto">
                          <div 
                            className="text-sm text-gray-900 content-body" 
                            dangerouslySetInnerHTML={{ 
                              __html: autosaveContent.content ? highlightHtmlDiff(currentContent.content || '', autosaveContent.content) : '<span class="text-gray-400 italic">Empty</span>' 
                            }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Excerpt Diff */}
                {currentContent.excerpt !== autosaveContent.excerpt && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Excerpt</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">Current</span>
                        </div>
                        <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg min-h-[80px]">
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{currentContent.excerpt || <span className="text-gray-400 italic">Empty</span>}</p>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Autosaved (with changes highlighted)</span>
                        </div>
                        <div className="p-4 bg-green-50 border border-green-300 rounded-lg min-h-[80px]">
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">
                            {autosaveContent.excerpt ? highlightTextDiff(currentContent.excerpt || '', autosaveContent.excerpt) : <span className="text-gray-400 italic">Empty</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Custom Fields Diff */}
                {customFieldsChanged && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Custom Fields</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">Current</span>
                        </div>
                        <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg min-h-[80px]">
                          {(!currentContent.custom_fields || currentContent.custom_fields.length === 0) ? (
                            <span className="text-gray-400 italic text-sm">No custom fields</span>
                          ) : (
                            <div className="space-y-2">
                              {currentContent.custom_fields.map((field) => (
                                <div key={field.meta_key || Math.random()} className="text-sm">
                                  <span className="font-medium text-gray-700">{field.meta_key}:</span>{' '}
                                  <span className="text-gray-900">{field.meta_value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Autosaved</span>
                        </div>
                        <div className="p-4 bg-green-50 border border-green-300 rounded-lg min-h-[80px]">
                          {(!autosaveContent.custom_fields || autosaveContent.custom_fields.length === 0) ? (
                            <span className="text-gray-400 italic text-sm">No custom fields</span>
                          ) : (
                            <div className="space-y-2">
                              {autosaveContent.custom_fields.map((field) => (
                                <div key={field.meta_key || Math.random()} className="text-sm">
                                  <span className="font-medium text-gray-700">{field.meta_key}:</span>{' '}
                                  <span className="text-gray-900">{field.meta_value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Page Attributes Diff */}
                {pageAttributesChanged && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Page Attributes</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">Current</span>
                        </div>
                        <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
                          <div className="space-y-2 text-sm">
                            {parentChanged && (
                              <div>
                                <span className="font-medium text-gray-700">Parent:</span>{' '}
                                <span className="text-gray-900">{getParentTitle(currentContent.parent_id)}</span>
                              </div>
                            )}
                            {menuOrderChanged && (
                              <div>
                                <span className="font-medium text-gray-700">Menu Order:</span>{' '}
                                <span className="text-gray-900">{currentContent.menu_order}</span>
                              </div>
                            )}
                            {authorChanged && (
                              <div>
                                <span className="font-medium text-gray-700">Author:</span>{' '}
                                <span className="text-gray-900">{getAuthorName(currentContent.author_id)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Autosaved</span>
                        </div>
                        <div className="p-4 bg-green-50 border border-green-300 rounded-lg">
                          <div className="space-y-2 text-sm">
                            {parentChanged && (
                              <div>
                                <span className="font-medium text-gray-700">Parent:</span>{' '}
                                <span className="text-gray-900">{getParentTitle(autosaveContent.parent_id ?? currentContent.parent_id)}</span>
                              </div>
                            )}
                            {menuOrderChanged && (
                              <div>
                                <span className="font-medium text-gray-700">Menu Order:</span>{' '}
                                <span className="text-gray-900">{autosaveContent.menu_order ?? currentContent.menu_order}</span>
                              </div>
                            )}
                            {authorChanged && (
                              <div>
                                <span className="font-medium text-gray-700">Author:</span>{' '}
                                <span className="text-gray-900">{getAuthorName(autosaveContent.author_id ?? currentContent.author_id)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SEO Metadata Diff */}
                {seoMetadataChanged && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">SEO Metadata</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">Current</span>
                        </div>
                        <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
                          <div className="space-y-2 text-sm">
                            {seoTitleChanged && (
                              <div>
                                <span className="font-medium text-gray-700">SEO Title:</span>{' '}
                                <span className="text-gray-900">{currentContent.seo_title || <span className="text-gray-400 italic">Empty</span>}</span>
                              </div>
                            )}
                            {seoDescriptionChanged && (
                              <div>
                                <span className="font-medium text-gray-700">SEO Description:</span>{' '}
                                <span className="text-gray-900">{currentContent.seo_description || <span className="text-gray-400 italic">Empty</span>}</span>
                              </div>
                            )}
                            {seoKeywordsChanged && (
                              <div>
                                <span className="font-medium text-gray-700">SEO Keywords:</span>{' '}
                                <span className="text-gray-900">{currentContent.seo_keywords || <span className="text-gray-400 italic">Empty</span>}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Autosaved</span>
                        </div>
                        <div className="p-4 bg-green-50 border border-green-300 rounded-lg">
                          <div className="space-y-2 text-sm">
                            {seoTitleChanged && (
                              <div>
                                <span className="font-medium text-gray-700">SEO Title:</span>{' '}
                                <span className="text-gray-900">{autosaveContent.seo_title || <span className="text-gray-400 italic">Empty</span>}</span>
                              </div>
                            )}
                            {seoDescriptionChanged && (
                              <div>
                                <span className="font-medium text-gray-700">SEO Description:</span>{' '}
                                <span className="text-gray-900">{autosaveContent.seo_description || <span className="text-gray-400 italic">Empty</span>}</span>
                              </div>
                            )}
                            {seoKeywordsChanged && (
                              <div>
                                <span className="font-medium text-gray-700">SEO Keywords:</span>{' '}
                                <span className="text-gray-900">{autosaveContent.seo_keywords || <span className="text-gray-400 italic">Empty</span>}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-6 bg-gray-50">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Choose which version to keep. You must make a choice to continue editing.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={onUseCurrent}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Keep Current
                </button>
                <button
                  onClick={onUseAutosave}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Restore Autosave
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

