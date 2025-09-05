'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PartialBlock } from '@blocknote/core';
import Editor from '@/components/Lesson/editorAI/Editor';
import { Button } from '@/components/ui/button';
import { BarChart3, Sparkles, BookOpen, Brain, FileText, ArrowLeft, ChevronUp, ChevronDown, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { FlashcardsPanel } from '@/components/Lesson/flashcard/FlashcardsPanel';
import ContentPage from '@/components/contentPage/ContentPage';

export default function LessonPage() {

  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const classId = Array.isArray(params.classId) ? params.classId[0] : params.classId;
  // Use the route segment name: this page is in [nodeId], so the param key is 'nodeId'
  const nodeId = Array.isArray(params.nodeId) ? params.nodeId[0] : params.nodeId;
  console.log('nodeId received in lesson page', nodeId);
  const nodeTitle = searchParams.get('nodeTitle') ?? '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  type LessonNoteResponse = { content?: unknown; contentText?: string } | null;
  const [note, setNote] = useState<LessonNoteResponse>(null);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // const userId = session?.user?.id ?? 'unknown';
  // const userEmail = session?.user?.email ?? 'unknown';
  // const userName = session?.user?.name ?? 'unknown';

  const [viewMode, setViewMode] = useState<'overview' | 'content' | 'ai-lesson' | 'flashcards' | 'summary'>('overview');
  const [showTopBar, setShowTopBar] = useState(true);

  const fetchNote = useCallback(async () => {
    if (!classId || !nodeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/lesson-notes?classId=${classId}&dbNodeId=${nodeId}`);
      const data = await res.json();
      setNote(data);
    } finally {
      setLoading(false);
    }
  }, [classId, nodeId]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  const autosave = useCallback(async (content: unknown, title?: string) => {
    if (!classId || !nodeId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/lesson-notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, dbNodeId: nodeId, content, title }),
      });
      if (res.ok) {
        const updated = await res.json();
        setNote(updated);
      }
    } finally {
      setSaving(false);
    }
  }, [classId, nodeId]);

  const onEditorChange = useCallback((content: unknown) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      autosave(content, nodeTitle);
    }, 1000);
  }, [autosave, nodeTitle]);

  const onAIEntry = useCallback(async (payload: { action: string; selectedText?: string; outputBlocks: unknown; outputMarkdown?: string }) => {
    if (!classId || !nodeId) return;
    await fetch('/api/lesson-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId, dbNodeId: nodeId, ...payload }),
    });
  }, [classId, nodeId]);

  return (
    <div className=" bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className={`transition-all duration-300 ease-in-out ${showTopBar ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'} fixed top-0 left-0 right-0 z-40`}>
        <div className="relative">
          <div className="flex items-center justify-between p-6 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-lg">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/class/${classId}/pathway`)}
                className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Link href="/teacher/dashboard" className="hidden sm:inline-flex items-center gap-2 btn-secondary-emerald rounded-full px-3 py-1.5">
                <LayoutDashboard className="w-4 h-4" />
                <span className="text-sm">Dashboard</span>
              </Link>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{nodeTitle || 'Lesson'}</h2>
                <p className="text-sm text-slate-500 mt-0.5">Interactive Learning Experience</p>
              </div>
            </div>

            {/* Center Tabs */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex bg-slate-100 p-1 rounded-lg">
              {/* <button
                onClick={() => setViewMode('overview')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${viewMode === 'overview' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'}`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Overview</span>
              </button> */}
              <button
                onClick={() => setViewMode('ai-lesson')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${viewMode === 'ai-lesson' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'}`}
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Lesson</span>
              </button>
              <button
                onClick={() => setViewMode('content')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${viewMode === 'content' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'}`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Content</span>
              </button>
              <button
                onClick={() => setViewMode('flashcards')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${viewMode === 'flashcards' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'}`}
              >
                <Brain className="w-4 h-4" />
                <span>Flashcards</span>
              </button>
              <button
                onClick={() => setViewMode('summary')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${viewMode === 'summary' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'}`}
              >
                <FileText className="w-4 h-4" />
                <span>Summary</span>
              </button>
            </div>

            {/* Right spacer */}
            <div className="w-10" />
          </div>

          {/* Toggle Button */}
          <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-4">
            <Button
              onClick={() => setShowTopBar(!showTopBar)}
              variant="outline"
              size="sm"
              className="bg-white/95 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-200 rounded-full w-8 h-8 p-0"
            >
              {showTopBar ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Show Toggle Button when bar is hidden */}
      {!showTopBar && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <Button
            onClick={() => setShowTopBar(true)}
            variant="outline"
            size="sm"
            className="bg-white/90 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-200 rounded-full w-8 h-8 p-0"
          >
            <ChevronDown className="w-4 h-4 text-slate-600" />
          </Button>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`h-screen-min flex flex-1 min-h-0 relative transition-all duration-300 ${showTopBar ? 'pt-24' : 'pt-0'}`}>
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 p-6 overflow-hidden min-h-0">
            <div className=" overflow-hidden h-full">
              {/* {viewMode === 'overview' && (
                <div className="h-full p-6 text-slate-600">Overview coming soon…</div>
              )} */}
              {viewMode === 'ai-lesson' && (
                loading ? (
                  <div className="h-full p-6">Loading note…</div>
                ) : (
                  <div className="h-full">
                    <Editor
                      onChange={onEditorChange}
                      onAIEntry={onAIEntry}
                      initialContent={Array.isArray(note?.content) ? (note?.content as PartialBlock[]) : undefined}
                      title={nodeTitle}
                    />
                    <div className="px-6 pb-3 text-xs text-gray-500">{saving ? 'Saving…' : 'Saved'}</div>
                  </div>
                )
              )}
              {viewMode === 'content' && (
                <div className="h-full">
                  <ContentPage />
                </div>
              )}
              {viewMode === 'flashcards' && (
                <div className="h-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden min-h-[600px]">
                  <FlashcardsPanel 
                    key={`${nodeId}-${nodeTitle}`}
                    nodeId={nodeId || ''} 
                    nodeTitle={nodeTitle || ''} 
                    markdownContent={note?.contentText ?? ''} 
                  />
                </div>
              )}
              {viewMode === 'summary' && (
                <div className="h-full p-6 text-slate-600">Summary coming soon…</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

