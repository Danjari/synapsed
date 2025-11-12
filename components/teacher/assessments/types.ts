// Shared types for quiz/assessment feature

export type QuizStatus = 'draft' | 'published' | 'archived';

export type QuestionType = 'multiple-choice' | 'short-answer' | 'true-false';

export type AnswerOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

export type Question = {
  id: string;
  text: string;
  type: QuestionType;
  options: AnswerOption[];
  image?: string;
  hasError?: boolean;
  order?: number;
};

export type Quiz = {
  id: string;
  title: string;
  description?: string;
  status: QuizStatus;
  createdAt: Date;
  updatedAt?: Date;
  submissions: number;
  totalStudents: number;
  gradeAverage?: number;
  questions?: Question[];
};

export type Student = {
  id: string;
  name: string;
  email: string;
  submittedAt?: Date;
  score?: number;
  status: 'submitted' | 'in-progress' | 'not-started';
};

export type SaveStatus = 'unsaved' | 'saving' | 'saved';

