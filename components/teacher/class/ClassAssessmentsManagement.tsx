"use client";

import { useRouter } from 'next/navigation';
import { QuizDashboard } from '@/components/teacher/assessments/QuizDashboard';
import { QuizBuilder } from '@/components/teacher/assessments/QuizBuilder';
import { useState } from 'react';

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
    <QuizDashboard
      classId={classId}
      onCreateQuiz={handleCreateQuiz}
      onEditQuiz={handleEditQuiz}
    />
  );
}

