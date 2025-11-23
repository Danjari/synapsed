"use client";

import { QuizDashboard } from '@/components/teacher/assessments/QuizDashboard';
import { QuizBuilder } from '@/components/teacher/assessments/QuizBuilder';
import { StudentAssessmentList } from '@/components/teacher/assessments/StudentAssessmentList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

interface ClassAssessmentsManagementProps {
  classId: string;
}

export function ClassAssessmentsManagement({ classId }: ClassAssessmentsManagementProps) {
  const [currentView, setCurrentView] = useState<'dashboard' | 'builder'>('dashboard');
  const [activeTab, setActiveTab] = useState<'professor-led' | 'ai-led'>('professor-led');
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Assessments</h1>
        <p className="text-gray-600 mt-1">Manage quizzes and view student performance</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="professor-led">Professor-Led Quiz</TabsTrigger>
          <TabsTrigger value="ai-led">AI-Led Quiz</TabsTrigger>
        </TabsList>

        <TabsContent value="professor-led" className="mt-6">
          <QuizDashboard
            classId={classId}
            onCreateQuiz={handleCreateQuiz}
            onEditQuiz={handleEditQuiz}
          />
        </TabsContent>

        <TabsContent value="ai-led" className="mt-6">
          <StudentAssessmentList classId={classId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

