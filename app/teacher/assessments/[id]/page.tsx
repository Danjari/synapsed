"use client";

import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/teacher/SideBar';
import TopNav from '@/components/teacher/TopNav';
import { QuizBuilder } from '@/components/teacher/assessments/QuizBuilder';

export default function QuizBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;

  const handleBack = () => {
    router.push('/teacher/assessments');
  };

  return (
    <div className="min-h-screen">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <TopNav />

          <main className="flex-1">
            <QuizBuilder quizId={quizId} onBack={handleBack} />
          </main>
        </div>
      </div>
    </div>
  );
}

