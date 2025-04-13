'use client';

import AIAssistant from '@/components/AIAssistant';
import SynapsedFlow from '@/components/Pathway/PathwayDisplay';

export default function SynapsedPathwayPage() {
  return (
    <main className="min-h-screen">
      <div className="px-4 py-6 max-w-screen-xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Synapsed Learning Pathways</h1>
          <p className="text-gray-600">
            Generate personalized learning paths with AI. Type a topic and watch as Synapsed creates 
            an interactive learning journey for you.
          </p>
        </header>
        
        <div className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-100 min-h-[calc(100vh-180px)]">
          <SynapsedFlow />
        </div>
      </div>
      <AIAssistant/>
    </main>
  );
}