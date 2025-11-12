"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QuizTable } from './QuizTable';
import { QuizResultsModal } from './QuizResultsModal';
import { DashboardMetrics } from './DashboardMetrics';
import { Quiz } from './types';
import { Plus } from 'lucide-react';

interface QuizDashboardProps {
  classId: string;
  onCreateQuiz: () => void;
  onEditQuiz: (quizId: string) => void;
}

export function QuizDashboard({
  classId,
  onCreateQuiz,
  onEditQuiz,
}: QuizDashboardProps) {
  // Mock quiz data - will be replaced with API call later
  // TODO: Filter quizzes by classId when API is connected
  const [quizzes, setQuizzes] = useState<Quiz[]>([
    {
      id: '1',
      title: 'Introduction to React Hooks',
      status: 'published',
      createdAt: new Date('2024-01-15'),
      submissions: 24,
      totalStudents: 30,
      gradeAverage: 87,
    },
    {
      id: '2',
      title: 'Advanced TypeScript Patterns',
      status: 'archived',
      createdAt: new Date('2024-01-10'),
      submissions: 28,
      totalStudents: 30,
      gradeAverage: 92,
    },
    {
      id: '3',
      title: 'State Management with Redux',
      status: 'draft',
      createdAt: new Date('2024-01-20'),
      submissions: 0,
      totalStudents: 30,
    },
    {
      id: '4',
      title: 'CSS Grid and Flexbox Fundamentals',
      status: 'published',
      createdAt: new Date('2024-01-18'),
      submissions: 15,
      totalStudents: 30,
      gradeAverage: 78,
    },
  ]);

  const [selectedQuizForResults, setSelectedQuizForResults] = useState<
    string | null
  >(null);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    quizId: string;
    action: 'publish' | 'archive';
  } | null>(null);

  const handleToggleStatus = (quizId: string) => {
    const quiz = quizzes.find((q) => q.id === quizId);
    if (!quiz) return;

    if (quiz.status === 'draft' || quiz.status === 'archived') {
      setConfirmationDialog({
        quizId,
        action: 'publish',
      });
    } else {
      setConfirmationDialog({
        quizId,
        action: 'archive',
      });
    }
  };

  const confirmToggleStatus = () => {
    if (!confirmationDialog) return;

    setQuizzes(
      quizzes.map((quiz) =>
        quiz.id === confirmationDialog.quizId
          ? {
              ...quiz,
              status:
                confirmationDialog.action === 'publish'
                  ? 'published'
                  : 'archived',
            }
          : quiz,
      ),
    );

    setConfirmationDialog(null);
  };

  const handleViewResults = (quizId: string) => {
    setSelectedQuizForResults(quizId);
  };

  const handlePreview = (quizId: string) => {
    // Navigate to preview page
    window.open(`/teacher/assessments/${quizId}/preview`, '_blank');
  };

  const selectedQuiz = quizzes.find((q) => q.id === selectedQuizForResults);

  return (
    <div className="min-h-screen w-full">
      {/* Header */}
      <div className="glass rounded-2xl mx-4 my-4 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your Quizzes</h1>
          <p className="text-slate-600 mt-1">Create and manage your quizzes and assessments.</p>
        </div>
        <Button onClick={onCreateQuiz} variant="default">
          <Plus size={20} className="mr-2" />
          Create New Quiz
        </Button>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Metrics Panel */}
          <div className="col-span-12 lg:col-span-3">
            <DashboardMetrics quizzes={quizzes} />
          </div>

          {/* Quiz Table */}
          <div className="col-span-12 lg:col-span-9">
            {quizzes.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center">
                  <div className="h-24 w-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                    <Plus className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">No quizzes yet</h2>
                  <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                    Get started by creating your first quiz. You can build
                    assessments with multiple choice, short answer, and
                    true/false questions.
                  </p>
                  <Button onClick={onCreateQuiz} variant="default">
                    <Plus size={20} className="mr-2" />
                    Create Your First Quiz
                  </Button>
                </div>
              </Card>
            ) : (
              <QuizTable
                quizzes={quizzes}
                onToggleStatus={handleToggleStatus}
                onViewResults={handleViewResults}
                onEdit={onEditQuiz}
                onPreview={handlePreview}
              />
            )}
          </div>
        </div>
      </div>

      {/* Results Modal */}
      {selectedQuiz && (
        <QuizResultsModal
          quiz={selectedQuiz}
          onClose={() => setSelectedQuizForResults(null)}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmationDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              {confirmationDialog.action === 'publish'
                ? 'Publish Quiz'
                : 'Archive Quiz'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {confirmationDialog.action === 'publish'
                ? 'Are you sure you want to publish this quiz? Students will be able to access and submit their answers.'
                : 'Are you sure you want to archive this quiz? Students will no longer be able to submit answers.'}
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setConfirmationDialog(null)}
              >
                Cancel
              </Button>
              <Button variant="default" onClick={confirmToggleStatus}>
                {confirmationDialog.action === 'publish'
                  ? 'Publish Quiz'
                  : 'Archive Quiz'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

