'use client';

import { filterSuggestionItems } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { en } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import { useState, useEffect } from "react";

// Import your AI extension
import { getAISlashMenuItems } from "@danjari/blocknote-ai-extension";
import { callAI } from "@/lib/Editor/aiClient";

export default function Editor() {
  //const [aiResponses, setAiResponses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  const editor = useCreateBlockNote({
    dictionary: en,
    initialContent: [
      {
        type: "heading",
        props: { level: 1 },
        content: "AI-Powered BlockNote Editor",
      },
      {
        type: "paragraph",
        content: "Type '/' to see AI commands. Select text and try /explain, /summarize, /quiz-me, or /diagram.",
      },
    ],
  });

  const handleAICommand = async (action: string, payload?: { selectedText?: string }) => {
    console.log("🤖 AI Command:", action, payload);
    
    setIsLoading(true);
    
    try {
      // Get selected text or use full document content
      const selectedText = payload?.selectedText || editor.getSelectedText();
      const hasSelection = selectedText && selectedText.length > 0;
      
      // Get full document content as context
      const fullContent = editor.document;
      const fullContext = JSON.stringify(fullContent, null, 2);
      
      console.log("📄 Full context length:", fullContext.length);
      console.log("🎯 Has selection:", hasSelection, "Selection length:", selectedText?.length);
      
      // Use selected text if available, otherwise use full context
      const contextToUse = hasSelection ? selectedText : fullContext;
      const aiResponse = await callAI(action, contextToUse, fullContext);
      
      // Add to responses log
      //setAiResponses(prev => [...prev, aiResponse]);
      
      // Parse markdown using BlockNote's built-in parser
      const blocks = await editor.tryParseMarkdownToBlocks(aiResponse);
      
      // Insert the parsed blocks
      editor.insertBlocks(blocks, editor.getTextCursorPosition().block, "after");
      
    } catch (error) {
      console.error('AI error:', error);
      //const errorMessage = `Sorry, I couldn't process that request.`;
      // setAiResponses(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient) {
    return <div className="max-w-6xl mx-auto p-6">Loading editor...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Loading indicator */}
      {isLoading && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          AI is thinking...
        </div>
      )}
      
      {/* AI Controls */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          onClick={() => handleAICommand('explain')}
          className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
        >
          Explain
        </button>
        <button
          onClick={() => handleAICommand('summarize')}
          className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
        >
          Summarize
        </button>
        <button
          onClick={() => handleAICommand('quiz-me')}
          className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
        >
          Quiz Me
        </button>
        <button
          onClick={() => handleAICommand('diagram')}
          className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
        >
          Create Diagram
        </button>
      </div>
      
      {/* Editor */}
      <div className="border rounded-lg overflow-hidden">
        <BlockNoteView
          editor={editor}
          slashMenu={false}
        >
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) => {
              const defaultItems = getDefaultReactSlashMenuItems(editor);
              const aiItems = getAISlashMenuItems(editor, handleAICommand);
              const allItems = [...defaultItems, ...aiItems];
              return filterSuggestionItems(allItems, query);
            }}
          />
        </BlockNoteView>
      </div>
      
      {/* AI Responses Log */}
      {/* {aiResponses.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">AI Responses:</h3>
          {aiResponses.map((response, index) => (
            <div key={index} className="mb-3 p-3 bg-white border rounded">
              <strong>Response {index + 1}:</strong>
              <pre className="mt-2 text-sm whitespace-pre-wrap">{response}</pre>
            </div>
          ))}
        </div>
      )} */}
    </div>
  );
}