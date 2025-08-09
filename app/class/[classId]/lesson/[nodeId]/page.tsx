'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function LessonPage() {
  const { data: session } = useSession();
  const params = useParams();
  const searchParams = useSearchParams();

  const classId = Array.isArray(params.classId) ? params.classId[0] : params.classId;
  const nodeId = Array.isArray(params.nodeId) ? params.nodeId[0] : params.nodeId;
  const nodeTitle = searchParams.get('nodeTitle') ?? '';

  const userId = session?.user?.id ?? 'unknown';
  const userEmail = session?.user?.email ?? 'unknown';
  const userName = session?.user?.name ?? 'unknown';

  return (
    <main className="min-h-screen">
      <div className="px-4 py-6 max-w-screen-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">Lesson</h1>
        <div className="space-y-2 text-sm">
          <div><span className="font-semibold">Class ID:</span> {classId}</div>
          <div><span className="font-semibold">Node ID:</span> {nodeId}</div>
          <div><span className="font-semibold">Node Title:</span> {nodeTitle}</div>
          <div><span className="font-semibold">Student ID:</span> {userId}</div>
          <div><span className="font-semibold">Student Name:</span> {userName}</div>
          <div><span className="font-semibold">Student Email:</span> {userEmail}</div>
        </div>
      </div>
    </main>
  );
}

