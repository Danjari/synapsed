// Re-export types from lib/types/quizzes for backward compatibility
export type {
  QuizStatus,
  QuestionType,
  Question,
  Quiz,
  RichTextContent,
  QuestionOption as AnswerOption,
  QuestionOptionInput,
} from '@/lib/types/quizzes';

export type SaveStatus = 'unsaved' | 'saving' | 'saved';

export type Student = {
  id: string;
  name: string;
  email: string;
  submittedAt?: Date;
  score?: number;
  status: 'submitted' | 'in-progress' | 'not-started';
};

