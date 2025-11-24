"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { PartialBlock } from "@blocknote/core";

interface RichTextEditorProps {
  value: string; // Can be markdown or JSON string
  onChange: (value: string) => void;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [isClient, setIsClient] = useState(false);
  const [initialContent, setInitialContent] = useState<PartialBlock[] | undefined>(undefined);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Parse initial value - try JSON first, then markdown
  useEffect(() => {
    if (value) {
      try {
        // Try parsing as JSON (BlockNote format)
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setInitialContent(parsed);
          return;
        }
      } catch {
        // Not JSON, will treat as markdown
      }
    }
    // If no value or not valid JSON, set to undefined (will use default)
    setInitialContent(undefined);
  }, []); // Only run once on mount

  const editor = useCreateBlockNote({
    initialContent: initialContent || [
      {
        type: "paragraph",
        content: value || "Enter question text...",
      },
    ],
  });

  // Store editor reference
  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
    }
  }, [editor]);

  // Handle content changes - convert to markdown
  const handleChange = async () => {
    if (editorRef.current) {
      try {
        const blocks = editorRef.current.document;
        // Convert blocks to markdown
        const markdown = await editorRef.current.blocksToMarkdown(blocks);
        onChange(markdown);
      } catch (error) {
        console.error('Error converting blocks to markdown:', error);
        // Fallback: use plain text
        const text = editorRef.current.document
          .map(block => {
            if (typeof block.content === 'string') return block.content;
            if (Array.isArray(block.content)) {
              return block.content
                .map(item => typeof item === 'string' ? item : item.text || '')
                .join('');
            }
            return '';
          })
          .join('\n');
        onChange(text);
      }
    }
  };

  if (!isClient) {
    return (
      <div className="border border-slate-300 dark:border-slate-600 rounded-md p-3 min-h-[120px] bg-white dark:bg-slate-900">
        <div className="text-slate-400">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="border border-slate-300 dark:border-slate-600 rounded-md overflow-hidden">
      <div className="bg-white dark:bg-slate-900">
        <BlockNoteView
          editor={editor}
          onChange={handleChange}
          className="min-h-[120px]"
        />
      </div>
    </div>
  );
}
