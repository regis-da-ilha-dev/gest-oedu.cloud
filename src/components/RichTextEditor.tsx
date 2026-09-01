import React, { useMemo, useEffect, useState, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { cn } from '../lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

const RichTextEditor = React.memo(({ value, onChange, placeholder, className, compact = false }: RichTextEditorProps) => {
  const [mounted, setMounted] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const lastSentValueRef = useRef(value);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync localValue with parent changes (e.g., loaded questions, resets)
  useEffect(() => {
    if (value !== lastSentValueRef.current) {
      setLocalValue(value);
      lastSentValueRef.current = value;
    }
  }, [value]);

  // Debounce state notifications to prevent lagging re-renders in the parent
  useEffect(() => {
    if (localValue === value) return;

    const handler = setTimeout(() => {
      lastSentValueRef.current = localValue;
      onChange(localValue);
    }, 250);

    return () => clearTimeout(handler);
  }, [localValue, onChange, value]);

  const modules = useMemo(() => ({
    toolbar: compact ? [
      ['bold', 'italic', 'underline'],
      [{ 'color': ['#000000', '#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#ea580c', '#9333ea', '#e11d48'] }, { 'background': ['#ffffff', '#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff', '#fecaca'] }],
      ['clean']
    ] : [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': ['#000000', '#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#ea580c', '#9333ea', '#e11d48'] }, { 'background': ['#ffffff', '#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff', '#fecaca'] }],
      [{ 'align': '' }, { 'align': 'center' }, { 'align': 'right' }, { 'align': 'justify' }],
      ['clean']
    ]
  }), [compact]);

  const formats = useMemo(() => [
    'bold', 'italic', 'underline', 'strike', 'color', 'background', 'align'
  ], []);

  if (!mounted) {
    return (
      <div className={cn(compact ? "h-[50px]" : "h-[150px]", "bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center", className)}>
        <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  const handleBlur = () => {
    if (localValue !== value) {
      lastSentValueRef.current = localValue;
      onChange(localValue);
    }
  };

  return (
    <div className={cn("rich-text-editor", compact && "compact", className)}>
      <ReactQuill 
        theme="snow"
        value={localValue}
        onChange={setLocalValue}
        onBlur={handleBlur}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="bg-slate-50 rounded-2xl border-none"
      />
      <style>{`
        .rich-text-editor .ql-toolbar.ql-snow {
          border: none;
          background: #f8fafc;
          border-bottom: 1px solid #f1f5f9;
          border-radius: 1rem 1rem 0 0;
        }
        .rich-text-editor .ql-container.ql-snow {
          border: none;
          min-height: 120px;
          height: auto !important;
          font-family: inherit;
        }
        .rich-text-editor .ql-editor {
          font-size: 14px;
          color: #1f2937;
          line-height: 1.7;
          letter-spacing: normal !important;
          word-spacing: normal !important;
          padding: 1rem;
          overflow-y: visible !important;
          height: auto !important;
          min-height: 120px;
          hyphens: none !important;
          -webkit-hyphens: none !important;
          text-wrap: pretty;
          word-break: normal !important;
          overflow-wrap: break-word !important;
          word-wrap: break-word !important;
        }
        .rich-text-editor.compact .ql-container.ql-snow {
          min-height: 50px !important;
        }
        .rich-text-editor.compact .ql-editor {
          min-height: 50px !important;
          padding: 0.5rem 0.75rem !important;
        }
        .rich-text-editor.compact .ql-toolbar.ql-snow {
          padding: 4px 8px !important;
        }
        .ql-align-center { text-align: center !important; }
        .ql-align-right { text-align: right !important; }
        .ql-align-justify { 
          text-align: justify !important; 
          text-justify: inter-word !important;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #94a3b8;
          font-style: normal;
          left: 1rem;
        }
        .rich-text-editor.compact .ql-editor.ql-blank::before {
          left: 0.75rem;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
