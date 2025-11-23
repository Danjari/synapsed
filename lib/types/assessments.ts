/**
 * Assessment-related TypeScript types
 */

export interface FormedibleField {
  name: string;
  type: "text" | "textarea" | "select" | "radio" | "multiselect" | "number" | "checkbox";
  label: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  [key: string]: unknown;
}

export interface AssessmentResponse {
  [questionLabel: string]: string | number | boolean | string[];
}

export interface AssessmentCorrectAnswers {
  [fieldName: string]: string | number | boolean | string[];
}

export interface InChatAssessmentData {
  assessmentId: string;
  topic: string;
  submittedAt: string;
  score: number | null;
  feedback: string | null;
  responses: AssessmentResponse;
  fields: FormedibleField[];
  correctAnswers: AssessmentCorrectAnswers;
}

export interface NodeAssessmentData {
  nodeId: string;
  nodeTitle: string;
  nodeDescription: string;
  assessments: InChatAssessmentData[];
}

export interface StudentAssessmentData {
  studentId: string;
  studentName: string;
  studentEmail: string;
  aggregateScore: number | null;
  assessmentCount: number;
  performanceNotes: string;
  nodes: NodeAssessmentData[];
}

