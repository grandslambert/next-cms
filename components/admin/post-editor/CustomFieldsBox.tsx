'use client';

import { useRef, useEffect } from 'react';

interface CustomFieldsBoxProps {
  readonly customFields: Array<{meta_key: string, meta_value: string}>;
  readonly onAddField: () => void;
  readonly onRemoveField: (index: number) => void;
  readonly onFieldChange: (index: number, field: 'meta_key' | 'meta_value', value: string) => void;
}

export default function CustomFieldsBox({
  customFields,
  onAddField,
  onRemoveField,
  onFieldChange,
}: CustomFieldsBoxProps) {
  const lastFieldRef = useRef<HTMLInputElement>(null);
  const previousCountRef = useRef(customFields.length);

  // Focus on the newly added field's name input
  useEffect(() => {
    if (customFields.length > previousCountRef.current) {
      // A new field was added
      lastFieldRef.current?.focus();
    }
    previousCountRef.current = customFields.length;
  }, [customFields.length]);
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">Custom Fields</h3>
        <button
          type="button"
          onClick={onAddField}
          className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
        >
          + Add Field
        </button>
      </div>
      
      {customFields.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          No custom fields yet. Click "Add Field" to create one.
        </p>
      ) : (
        <div className="space-y-3">
          {customFields.map((field, index) => (
            <div key={index} className="p-3 border border-gray-200 rounded-lg">
              <div className="space-y-2">
                <input
                  ref={index === customFields.length - 1 ? lastFieldRef : null}
                  type="text"
                  placeholder="Field Name"
                  value={field.meta_key}
                  onChange={(e) => onFieldChange(index, 'meta_key', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <textarea
                  placeholder="Field Value"
                  value={field.meta_value}
                  onChange={(e) => onFieldChange(index, 'meta_value', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => onRemoveField(index)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <p className="mt-4 text-xs text-gray-500">
        Custom fields are saved automatically when you save the post
      </p>
    </div>
  );
}

