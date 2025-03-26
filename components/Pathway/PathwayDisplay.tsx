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
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import usePathwayStore, { PathwayState } from './store';
import PathwayNode from './PathwayNode';
import PathwayEdge from './PathwayEdge';
import './Pathway.css';

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
    isLoading,
    error,
    prompt,
  } = usePathwayStore(useShallow(selector));
  
  const [inputPrompt, setInputPrompt] = useState(prompt);
  
  // Fetch pathway on initial load
  useEffect(() => {
    fetchPathway(prompt);
  }, []);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPathway(inputPrompt);
  };
  
  return (
    <div className="pathway-container">
      {/* Prompt input form */}
      <div className="pathway-controls">
        <form onSubmit={handleSubmit} className="pathway-form">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Describe your learning pathway..."
            className="pathway-input"
          />
          <button 
            type="submit" 
            className="pathway-button"
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate Pathway'}
          </button>
        </form>
      </div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="pathway-loading">
          <div className="spinner"></div>
          <p>Generating your learning pathway...</p>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="pathway-error">
          <p>Error: {error}</p>
        </div>
      )}
      
      {/* The actual flow diagram */}
      <div className="pathway-flow">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
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