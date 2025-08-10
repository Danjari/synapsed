'use client';

import Editor from '@/components/Lesson/editorAI/Editor';

export default function TestEditorPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          AI-Powered BlockNote Editor
        </h1>
        <Editor />
      </div>
    </main>
  );
}