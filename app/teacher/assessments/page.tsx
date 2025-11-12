"use client";

import { useRouter } from 'next/navigation';
import Sidebar from '@/components/teacher/SideBar';
import TopNav from '@/components/teacher/TopNav';
import { QuizDashboard } from '@/components/teacher/assessments/QuizDashboard';

export default function AssessmentsPage() {
  const router = useRouter();

  const handleCreateQuiz = () => {
    // Generate a new quiz ID and navigate to builder
    const newQuizId = `quiz-${Date.now()}`;
    router.push(`/teacher/assessments/${newQuizId}`);
  };

  const handleEditQuiz = (quizId: string) => {
    router.push(`/teacher/assessments/${quizId}`);
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
            <QuizDashboard
              onCreateQuiz={handleCreateQuiz}
              onEditQuiz={handleEditQuiz}
            />
          </main>
        </div>
      </div>
    </div>
  );
}

