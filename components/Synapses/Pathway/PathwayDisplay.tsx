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
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';

// No syntax highlighter needed here after moving content to a dedicated page

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
  
  const router = useRouter();
  const { data: session } = useSession();
  const { classId } = useParams();
  const studentId = session?.user?.id;
  const classIdStr = Array.isArray(classId) ? classId[0] : classId;
  const [pathwayExists, setPathwayExists] = useState<boolean | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Fetch pathway on initial load
  useEffect(() => {
    if (studentId && classIdStr) {
      fetchPathway(prompt, studentId, classIdStr);
    }
  }, [prompt, studentId, classIdStr, fetchPathway]);

  useEffect(() => {
    if (studentId && classIdStr) {
      fetch(`/api/pathway/exists/${classIdStr}/${studentId}`)
        .then(res => res.json())
        .then(data => setPathwayExists(data.exists));
    }
  }, [studentId, classIdStr]);
  
  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    const nodeTitle = (node.data as PathwayNodeData).title;
    if (classIdStr) {
      setIsNavigating(true);
      router.push(`/class/${classIdStr}/lesson/${node.id}?nodeTitle=${encodeURIComponent(nodeTitle)}`);
    }
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

      {/* Navigation spinner overlay */}
      {isNavigating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="h-10 w-10 rounded-full border-4 border-gray-300 border-t-gray-700 animate-spin" />
          <p className="mt-3 text-sm text-gray-700">Loading lesson…</p>
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