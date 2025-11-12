"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Question } from './types';
import { Plus, GripVertical, AlertCircle } from 'lucide-react';

interface QuizNavigationProps {
  questions: Question[];
  selectedQuestionId: string;
  onSelectQuestion: (id: string) => void;
  onAddQuestion: () => void;
  onReorderQuestions: (questions: Question[]) => void;
}

export function QuizNavigation({
  questions,
  selectedQuestionId,
  onSelectQuestion,
  onAddQuestion,
  onReorderQuestions,
}: QuizNavigationProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newQuestions = [...questions];
    const draggedItem = newQuestions[draggedIndex];
    newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(index, 0, draggedItem);

    onReorderQuestions(
      newQuestions.map((q, i) => ({ ...q, order: i + 1 })),
    );
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getQuestionTypeLabel = (type: Question['type']) => {
    switch (type) {
      case 'multiple-choice':
        return 'Multiple Choice';
      case 'short-answer':
        return 'Short Answer';
      case 'true-false':
        return 'True/False';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Questions</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
        {questions.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <p className="text-sm">No questions yet</p>
            <p className="text-xs mt-2">Click "Add Question" to get started</p>
          </div>
        ) : (
          questions.map((question, index) => (
          <div
            key={question.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`
              p-3 rounded-md cursor-pointer transition-colors
              ${
                selectedQuestionId === question.id
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-l-2 border-emerald-500'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }
              shadow-sm border border-slate-200 dark:border-slate-700
            `}
            onClick={() => onSelectQuestion(question.id)}
          >
            <div className="flex items-start">
              <div
                className="mt-1 mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-move"
                draggable={false}
              >
                <GripVertical size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                    {getQuestionTypeLabel(question.type)}
                  </span>
                  {question.hasError && (
                    <AlertCircle
                      size={16}
                      className="text-red-500 ml-1 flex-shrink-0"
                    />
                  )}
                </div>
                <p className="mt-1 text-sm truncate">
                  {question.text || 'Untitled Question'}
                </p>
              </div>
            </div>
          </div>
          ))
        )}
      </CardContent>
      <div className="p-3 border-t border-slate-200 dark:border-slate-700">
        <Button variant="default" className="w-full" onClick={onAddQuestion}>
          <Plus size={16} className="mr-2" />
          Add Question
        </Button>
      </div>
    </Card>
  );
}

