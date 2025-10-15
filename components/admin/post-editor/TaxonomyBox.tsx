'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface TaxonomyBoxProps {
  readonly taxonomy: any;
  readonly terms: any[];
  readonly selectedTerms: number[];
  readonly onTermsChange: (termIds: number[]) => void;
  readonly onTermAdded: () => void;
}

export default function TaxonomyBox({
  taxonomy,
  terms,
  selectedTerms,
  onTermsChange,
  onTermAdded,
}: TaxonomyBoxProps) {
  const [newTermName, setNewTermName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTerm = async () => {
    const name = newTermName.trim();
    if (!name) {
      toast.error('Please enter a term name', { duration: 3000 });
      return;
    }

    setIsCreating(true);
    try {
      const res = await axios.post('/api/terms', {
        taxonomy_id: taxonomy.id,
        name: name,
      });

      const newTerm = res.data.term;
      onTermsChange([...selectedTerms, newTerm.id]);
      setNewTermName('');
      onTermAdded(); // Refresh terms list
      toast.success(`${taxonomy.singular_label} created`);
    } catch (error) {
      toast.error(`Failed to create ${taxonomy.singular_label.toLowerCase()}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleTerm = (termId: number, checked: boolean) => {
    if (checked) {
      onTermsChange([...selectedTerms, termId]);
    } else {
      onTermsChange(selectedTerms.filter(id => id !== termId));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="font-semibold text-gray-900 mb-4">{taxonomy.label}</h3>
      
      <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
        {terms.map((term: any) => (
          <label key={term.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={selectedTerms.includes(term.id)}
              onChange={(e) => handleToggleTerm(term.id, e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">{term.name}</span>
          </label>
        ))}
      </div>

      <div className="border-t pt-4">
        <p className="text-xs text-gray-500 mb-2">Add New {taxonomy.singular_label}:</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTermName}
            onChange={(e) => setNewTermName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateTerm())}
            placeholder={`New ${taxonomy.singular_label.toLowerCase()}`}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={isCreating}
          />
          <button
            type="button"
            onClick={handleCreateTerm}
            disabled={isCreating}
            className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {isCreating ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

