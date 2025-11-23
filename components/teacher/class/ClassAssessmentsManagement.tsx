"use client";

import { QuizDashboard } from '@/components/teacher/assessments/QuizDashboard';
import { QuizBuilder } from '@/components/teacher/assessments/QuizBuilder';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';

interface ClassAssessmentsManagementProps {
  classId: string;
}

export function ClassAssessmentsManagement({ classId }: ClassAssessmentsManagementProps) {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<'dashboard' | 'builder'>('dashboard');
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);

  const handleCreateQuiz = () => {
    setEditingQuizId(null);
    setCurrentView('builder');
  };

  const handleEditQuiz = (quizId: string) => {
    setEditingQuizId(quizId);
    setCurrentView('builder');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setEditingQuizId(null);
  };

  const handleViewResults = () => {
    router.push(`/teacher/assessments/results/${classId}`);
  };

  if (currentView === 'builder') {
    return (
      <QuizBuilder 
        quizId={editingQuizId || undefined} 
        classId={classId}
        onBack={handleBackToDashboard} 
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Professor-Led Quizzes</h2>
        <Button onClick={handleViewResults} variant="outline">
          <BarChart3 className="h-4 w-4 mr-2" />
          View Assessment Results
        </Button>
      </div>
      <QuizDashboard
        classId={classId}
        onCreateQuiz={handleCreateQuiz}
        onEditQuiz={handleEditQuiz}
      />
    </div>
  );
}

