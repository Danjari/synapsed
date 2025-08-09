'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PartialBlock } from '@blocknote/core';
import Editor from '@/components/Lesson/editorAI/Editor';

export default function LessonPage() {
  const { data: session } = useSession();
  const params = useParams();
  const searchParams = useSearchParams();

  const classId = Array.isArray(params.classId) ? params.classId[0] : params.classId;
  const nodeId = Array.isArray(params.nodeId) ? params.nodeId[0] : params.nodeId;
  const nodeTitle = searchParams.get('nodeTitle') ?? '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  type LessonNoteResponse = { content?: unknown } | null;
  const [note, setNote] = useState<LessonNoteResponse>(null);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  const userId = session?.user?.id ?? 'unknown';
  const userEmail = session?.user?.email ?? 'unknown';
  const userName = session?.user?.name ?? 'unknown';

  const fetchNote = useCallback(async () => {
    if (!classId || !nodeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/lesson-notes?classId=${classId}&nodeId=${nodeId}`);
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
      await fetch('/api/lesson-notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, nodeId, content, title }),
      });
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
      body: JSON.stringify({ classId, nodeId, ...payload }),
    });
  }, [classId, nodeId]);

  return (
    <main className="min-h-screen">
      <div className="px-4 py-6 max-w-screen-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2">Lesson</h1>
        <div className="mb-6 text-sm space-y-1">
          <div><span className="font-semibold">Class ID:</span> {classId}</div>
          <div><span className="font-semibold">Node ID:</span> {nodeId}</div>
          <div><span className="font-semibold">Node Title:</span> {nodeTitle}</div>
          <div><span className="font-semibold">Student ID:</span> {userId}</div>
          <div><span className="font-semibold">Student Name:</span> {userName}</div>
          <div><span className="font-semibold">Student Email:</span> {userEmail}</div>
        </div>

        {loading ? (
          <div>Loading note…</div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Editor
              onChange={onEditorChange}
              onAIEntry={onAIEntry}
              initialContent={Array.isArray(note?.content) ? (note?.content as PartialBlock[]) : undefined}
              title={nodeTitle}
            />
          </div>
        )}

        <div className="mt-2 text-xs text-gray-500">{saving ? 'Saving…' : 'Saved'}</div>
      </div>
    </main>
  );
}

