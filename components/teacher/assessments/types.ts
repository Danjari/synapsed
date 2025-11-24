// Shared types for quiz/assessment feature

export type QuizStatus = 'draft' | 'published' | 'archived';

export type QuestionType = 'multiple-choice' | 'short-answer' | 'true-false';

export type AnswerOption = {
  id: string;
  text: string;
  isCorrect: boolean;
  order?: number;
};

export type Question = {
  id: string;
  text: string;
  richTextContent?: any; // BlockNote JSON content
  type: QuestionType;
  options: AnswerOption[];
  imageUrl?: string; // R2 URL instead of base64
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
  publishedAt?: Date;
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

