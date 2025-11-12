"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QuizNavigation } from './QuizNavigation';
import { QuestionEditor } from './QuestionEditor';
import { OCRImportModal } from './OCRImportModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Question, SaveStatus } from './types';
import { AlertCircle, Check, Save, ArrowLeft, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface QuizBuilderProps {
  quizId?: string;
  classId: string;
  onBack?: () => void;
}

export function QuizBuilder({ quizId, classId, onBack }: QuizBuilderProps) {
  const router = useRouter();
  const [quizName, setQuizName] = useState('Untitled Quiz');
  
  // TODO: Use classId when saving/loading quiz
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  
  // Update selected question when questions change
  useEffect(() => {
    if (questions.length > 0) {
      // If no question is selected or selected question doesn't exist, select the first one
      if (!selectedQuestionId || !questions.find(q => q.id === selectedQuestionId)) {
        setSelectedQuestionId(questions[0].id);
      }
    } else {
      setSelectedQuestionId('');
    }
  }, [questions, selectedQuestionId]);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

  // Load quiz data if quizId is provided
  useEffect(() => {
    if (quizId) {
      // TODO: Load quiz from API
      // For now, use mock data
      setQuizName('Sample Quiz');
    }
  }, [quizId]);

  const handleQuizNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuizName(e.target.value);
    setSaveStatus('unsaved');
  };

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: 'New Question',
      type: 'multiple-choice',
      options: [
        {
          id: `${Date.now()}-1`,
          text: 'Option 1',
          isCorrect: false,
        },
        {
          id: `${Date.now()}-2`,
          text: 'Option 2',
          isCorrect: false,
        },
      ],
      order: questions.length + 1,
    };
    setQuestions([...questions, newQuestion]);
    setSelectedQuestionId(newQuestion.id);
    setSaveStatus('unsaved');
  };

  const handleUpdateQuestion = (updatedQuestion: Question) => {
    setQuestions(
      questions.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q)),
    );
    setSaveStatus('unsaved');
  };

  const handleReorderQuestions = (reorderedQuestions: Question[]) => {
    setQuestions(reorderedQuestions);
    setSaveStatus('unsaved');
  };

  const handleSave = async () => {
    if (!quizName.trim()) {
      toast.error('Please provide a quiz title');
      return;
    }

    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    // Validate questions
    for (const q of questions) {
      if (!q.text.trim()) {
        toast.error('All questions must have text');
        return;
      }

      if (
        (q.type === 'multiple-choice' || q.type === 'true-false') &&
        q.options.length < 2
      ) {
        toast.error(`Question "${q.text}" needs at least 2 options`);
        return;
      }

      if (
        (q.type === 'multiple-choice' || q.type === 'true-false') &&
        !q.options.some((opt) => opt.isCorrect)
      ) {
        toast.error(`Question "${q.text}" needs at least one correct answer`);
        return;
      }
    }

    setSaveStatus('saving');
    // TODO: Save to API
    // Simulate API call
    setTimeout(() => {
      setSaveStatus('saved');
      toast.success('Quiz saved successfully');
    }, 1000);
  };

  const handlePublish = async () => {
    await handleSave();
    if (saveStatus === 'saved') {
      // TODO: Publish quiz via API
      toast.success('Quiz published successfully');
    }
  };

  const handlePreview = () => {
    // Navigate to preview page
    if (quizId) {
      window.open(`/teacher/assessments/${quizId}/preview`, '_blank');
    } else {
      // For new quizzes, show a message
      toast.info('Please save the quiz first before previewing');
    }
  };

  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId);

  return (
    <div className="min-h-screen w-full">
      {/* Header */}
      <div className="glass rounded-2xl mx-4 my-4 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <Input
            type="text"
            value={quizName}
            onChange={handleQuizNameChange}
            className="text-xl font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded px-2 py-1 w-auto min-w-[200px]"
            placeholder="Quiz Title"
          />
          <div className="flex items-center text-sm">
            {saveStatus === 'unsaved' && (
              <span className="text-amber-500 flex items-center">
                <AlertCircle size={16} className="mr-1" /> Unsaved changes
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="text-blue-500 flex items-center">
                <svg
                  className="animate-spin h-4 w-4 mr-1"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-emerald-500 flex items-center">
                <Check size={16} className="mr-1" /> All changes saved
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            onClick={handlePreview}
          >
            <Eye size={16} className="mr-2" />
            Preview as Student
          </Button>
          <Button variant="secondary" onClick={() => setShowOCRModal(true)}>
            Import via OCR
          </Button>
          <Button
            variant="secondary"
            onClick={handleSave}
            disabled={saveStatus === 'saved' || saveStatus === 'saving'}
          >
            <Save size={16} className="mr-2" />
            Save
          </Button>
          <Button variant="default" onClick={handlePublish}>
            Publish
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-6 flex h-[calc(100vh-120px)]">
        <div className="grid grid-cols-12 gap-6 w-full max-w-full">
          {/* Quiz Navigation (Left Panel) */}
          <div className="col-span-4">
            <QuizNavigation
              questions={questions}
              selectedQuestionId={selectedQuestionId}
              onSelectQuestion={setSelectedQuestionId}
              onAddQuestion={handleAddQuestion}
              onReorderQuestions={handleReorderQuestions}
            />
          </div>

          {/* Question Editor (Right Panel) */}
          <div className="col-span-8">
            {selectedQuestion && questions.length > 0 ? (
              <QuestionEditor
                question={selectedQuestion}
                onUpdateQuestion={handleUpdateQuestion}
              />
            ) : (
              <div className="glass rounded-2xl p-12 flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-slate-500 mb-4">
                    {questions.length === 0 
                      ? 'No questions yet. Click "Add Question" to get started.'
                      : 'Select a question to edit'}
                  </p>
                  {questions.length === 0 && (
                    <Button onClick={handleAddQuestion} variant="default">
                      Add Your First Question
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OCR Import Modal */}
      <OCRImportModal
        open={showOCRModal}
        onClose={() => setShowOCRModal(false)}
        onImport={(importedQuestions) => {
          setQuestions([...questions, ...importedQuestions]);
          setShowOCRModal(false);
          setSaveStatus('unsaved');
        }}
      />
    </div>
  );
}

