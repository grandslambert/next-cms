'use client';

import dynamic from 'next/dynamic';

// Dynamically import to avoid SSR issues
const Editor = dynamic(() => import('react-simple-wysiwyg').then(mod => mod.default), {
  ssr: false,
  loading: () => (
    <div className="min-h-[400px] bg-white border border-gray-300 rounded-lg flex items-center justify-center">
      <p className="text-gray-500">Loading editor...</p>
    </div>
  )
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  return (
    <div className="wysiwyg-editor">
      <Editor 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        containerProps={{ 
          style: { 
            minHeight: '400px',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            backgroundColor: 'white'
          } 
        }}
      />
    </div>
  );
}

