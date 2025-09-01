"use client";

import AIAssistant from '@/components/AIAssistant';
import SynapsedFlow from '@/components/Synapses/Pathway/PathwayDisplay';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SynapsedPathwayPage() {
  return (
    <main className="min-h-screen">
      <div className="px-4 py-6 max-w-screen-xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/teacher/dashboard" className="inline-flex items-center gap-2 btn-secondary-emerald rounded-full px-4 py-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Link>
              <h1 className="text-2xl md:text-3xl font-semibold text-slate-800 ml-2">Synapsed Learning Pathways</h1>
            </div>
          </div>
          <p className="text-slate-600 mt-2">
            Generate personalized learning paths with AI. Type a topic and watch as Synapsed creates an interactive journey.
          </p>
        </header>
        
        <div className="glass rounded-2xl overflow-hidden shadow-xl min-h-[calc(100vh-180px)]">
          <SynapsedFlow />
        </div>
      </div>
      <AIAssistant/>
    </main>
  );
}
