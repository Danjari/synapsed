'use client';
import {useShallow} from 'zustand/shallow';
import React, { useEffect, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Panel,
  ReactFlowProvider,
  BackgroundVariant,
  Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import usePathwayStore, { PathwayState, PathwayNodeData } from './store';
import PathwayNode from './PathwayNode';
import PathwayEdge from './PathwayEdge';
import './Pathway.css';
import ReactMarkdown from 'react-markdown';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import js from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import { atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { FlashcardsPanel } from '@/components/Lesson/flashcard/FlashcardsPanel';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';

SyntaxHighlighter.registerLanguage('javascript', js);

// Define node and edge types
const nodeTypes = {
  pathway: PathwayNode,
};

const edgeTypes = {
  pathway: PathwayEdge,
};



// Create selector for store values
const selector = (state: PathwayState) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  fetchPathway: state.fetchPathway,
  isLoading: state.isLoading,
  error: state.error,
  prompt: state.prompt,
  setPrompt: state.setPrompt,
});

function PathwayFlow() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    fetchPathway,
    prompt,
    isLoading,
  } = usePathwayStore(useShallow(selector));
  
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const { data: session } = useSession();
  const { classId } = useParams();
  const studentId = session?.user?.id;
  const classIdStr = Array.isArray(classId) ? classId[0] : classId;
  const [pathwayExists, setPathwayExists] = useState<boolean | null>(null);

  // Fetch pathway on initial load
  useEffect(() => {
    if (studentId && classIdStr) {
      fetchPathway(prompt, studentId, classIdStr);
    }
  }, [prompt, studentId, classIdStr, fetchPathway]);

  useEffect(() => {
    if (selectedNode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  
    // Clean up on unmount
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [selectedNode]);

  useEffect(() => {
    if (studentId && classIdStr) {
      fetch(`/api/pathway/exists/${classIdStr}/${studentId}`)
        .then(res => res.json())
        .then(data => setPathwayExists(data.exists));
    }
  }, [studentId, classIdStr]);
  
  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    setSelectedNode(node);
  };
  
  return (
    <div className="pathway-container">
      {/* Show message if pathway is not available */}
      {(!isLoading && pathwayExists === false && (
        <div className="flex flex-col items-center justify-center h-64 text-center text-gray-500">
          <div className="text-2xl mb-2">🍳 Your pathway is cooking!</div>
          <div>Your professor will approve it soon. Come back later.</div>
        </div>
      ))}
      {pathwayExists && nodes.length > 0 && (
        <div className="pathway-flow">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Controls />
            <MiniMap 
              nodeStrokeWidth={3}
              zoomable
              pannable
            />
            <Background 
              variant={'dots' as BackgroundVariant}
              gap={12} 
              size={1} 
              color="#f1f1f1" 
            />
            <Panel position="top-left" className="pathway-info-panel">
              <h3>Learning Pathway</h3>
              <p className="text-sm text-gray-600">
                {nodes.length} topics · {edges.length} connections
              </p>
            </Panel>
          </ReactFlow>
        </div>
      )}

      {selectedNode && (
  <div 
    onClick={() => setSelectedNode(null)} 
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    style={{ overflow: 'hidden' }}
  >
    <div 
      onClick={(e) => e.stopPropagation()}
      className="bg-white rounded-lg shadow-xl w-11/12 md:w-[600px]"
      style={{ 
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      <div className="sticky top-0 bg-white p-4 border-b z-10 flex justify-between items-center">
        <h2 className="text-xl font-bold truncate pr-8">
          {(selectedNode.data as PathwayNodeData).title}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFlashcards(!showFlashcards)}
            className="flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            {showFlashcards ? 'Content' : 'Flashcards'}
          </Button>
          <button
            onClick={() => setSelectedNode(null)}
            className="text-2xl text-gray-500 hover:text-gray-800"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>
      
      <div 
        className="p-6 pt-4"
        style={{ 
          overflowY: 'auto',
          overflowX: 'hidden',
          flexGrow: 1,
          maxHeight: 'calc(80vh - 70px)' // Subtract header height
        }}
      >
        {showFlashcards ? (
          <FlashcardsPanel
            nodeId={selectedNode.id}
            nodeTitle={(selectedNode.data as PathwayNodeData).title}
            markdownContent={(selectedNode.data as PathwayNodeData).markdownContent || ''}
            // quizQuestions={[]} // You can add quiz questions here if available
          />
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              code: ({ inline, className, children = '', ...props }: {
                inline?: boolean;
                className?: string;
                children?: React.ReactNode;
              }) => {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    language={match[1]}
                    PreTag="div"
                    wrapLines={true}
                    {...props}
                    style={{
                      ...atomOneLight,
                      'pre': {
                        maxWidth: '100%',
                        overflow: 'auto'
                      }
                    }}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {(selectedNode.data as PathwayNodeData).markdownContent || 'No content available.'}
          </ReactMarkdown>
        )}
      </div>
    </div>
  </div>
)}
    </div>
  );
}

// Wrap with provider to ensure React Flow hooks work
export default function SynapsedFlow() {
  return (
    <ReactFlowProvider>
      <PathwayFlow />
    </ReactFlowProvider>
  );
}