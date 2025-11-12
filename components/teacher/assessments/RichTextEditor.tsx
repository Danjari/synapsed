"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Code,
  List,
  ListOrdered,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [showLatexModal, setShowLatexModal] = useState(false);
  const [latexValue, setLatexValue] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current) {
      // Only update if the content is different to avoid cursor jumping
      const currentText = editorRef.current.textContent || '';
      // Strip HTML tags from value for comparison
      const valueText = value.replace(/<[^>]*>/g, '');
      if (currentText !== valueText && document.activeElement !== editorRef.current) {
        editorRef.current.textContent = valueText || value;
      }
    }
  }, [value]);

  const handleButtonClick = (command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      updateContent();
    }
  };

  const updateContent = () => {
    if (editorRef.current) {
      // Get plain text content (for simplicity, we'll store as text)
      const content = editorRef.current.textContent || '';
      onChange(content);
    }
  };

  const handleInsertLatex = () => {
    if (latexValue.trim()) {
      // Insert LaTeX with proper formatting
      const latexBlock = `\\(${latexValue}\\)`;
      if (editorRef.current) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode(latexBlock);
          range.insertNode(textNode);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        updateContent();
        setLatexValue('');
        setShowLatexModal(false);
      }
    }
  };

  return (
    <div className="border border-slate-300 dark:border-slate-600 rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-2 flex flex-wrap gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => handleButtonClick('bold')}
          title="Bold"
          className="h-8 w-8"
        >
          <Bold size={16} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => handleButtonClick('italic')}
          title="Italic"
          className="h-8 w-8"
        >
          <Italic size={16} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => handleButtonClick('underline')}
          title="Underline"
          className="h-8 w-8"
        >
          <Underline size={16} />
        </Button>
        <div className="h-6 mx-1 w-px bg-slate-300 dark:bg-slate-600"></div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => handleButtonClick('insertUnorderedList')}
          title="Bullet List"
          className="h-8 w-8"
        >
          <List size={16} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => handleButtonClick('insertOrderedList')}
          title="Numbered List"
          className="h-8 w-8"
        >
          <ListOrdered size={16} />
        </Button>
        <div className="h-6 mx-1 w-px bg-slate-300 dark:bg-slate-600"></div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowLatexModal(true)}
          title="Insert LaTeX"
          className="h-8 w-8 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <span className="font-serif italic text-sm">TeX</span>
        </Button>
      </div>

      {/* Editor */}
      <div className="relative">
        <div className="relative">
          <div
            ref={editorRef}
            contentEditable
            onInput={updateContent}
            onBlur={updateContent}
            className="p-3 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 whitespace-pre-wrap"
            suppressContentEditableWarning
          />
          {!value && (
            <div className="absolute top-3 left-3 text-slate-400 pointer-events-none">
              Enter question text...
            </div>
          )}
        </div>
        
        {/* LaTeX Preview */}
        {value && value.trim() && (
          <div className="border-t border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/50">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Preview:
            </p>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {value}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* LaTeX Modal */}
      <Dialog open={showLatexModal} onOpenChange={setShowLatexModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert LaTeX Formula</DialogTitle>
          </DialogHeader>
          <Input
            type="text"
            value={latexValue}
            onChange={(e) => setLatexValue(e.target.value)}
            placeholder="Enter LaTeX formula (e.g., \\frac{a}{b})"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleInsertLatex();
              }
            }}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowLatexModal(false);
                setLatexValue('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleInsertLatex}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

