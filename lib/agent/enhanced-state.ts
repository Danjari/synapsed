import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { z } from "zod";

// Enhanced state schema for comprehensive tutoring context
export const TutorState = Annotation.Root({
  // Core conversation state
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  
  // Context information
  classId: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
  }),
  lessonId: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
  }),
  studentId: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
  }),
  
  // Learning context
  currentTopic: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
  }),
  studentLevel: Annotation<'beginner' | 'intermediate' | 'advanced'>({
    reducer: (x, y) => y ?? x,
  }),
  learningObjectives: Annotation<string[]>({
    reducer: (x, y) => y ?? x,
  }),
  progress: Annotation<number>({
    reducer: (x, y) => y ?? x,
  }),
  
  // Dynamic context
  context: Annotation<Record<string, any>>({
    reducer: (x, y) => ({ ...x, ...y }),
  }),
  
  // Workflow state
  needsClarification: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
  }),
  lastAction: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
  }),
  
  // Worker results
  workerResults: Annotation<any[]>({
    default: () => [],
    reducer: (x, y) => x.concat(y),
  }),
  
  // Final response
  finalResponse: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
  }),
});

// Routing schema for intelligent query routing
export const RouteSchema = z.object({
  route: z.enum([
    'explanation',
    'assessment', 
    'knowledge_search',
    'comprehensive',
    'clarification',
    'progress_check',
    'exercise_help'
  ]).describe("The type of assistance needed"),
  confidence: z.number().min(0).max(1).describe("Confidence in the routing decision"),
  reasoning: z.string().describe("Why this route was chosen"),
  suggestedWorkers: z.array(z.string()).describe("Which workers should be activated")
});

// Worker result schema
export const WorkerResultSchema = z.object({
  workerType: z.string(),
  result: z.any(),
  confidence: z.number(),
  metadata: z.record(z.any()).optional(),
});

// Assessment schema
export const AssessmentSchema = z.object({
  understanding: z.enum(['low', 'medium', 'high']),
  gaps: z.array(z.string()),
  recommendations: z.array(z.string()),
  nextSteps: z.array(z.string()),
});

// Knowledge search result schema
export const KnowledgeResultSchema = z.object({
  content: z.string(),
  source: z.string(),
  relevance: z.number(),
  type: z.enum(['concept', 'example', 'exercise', 'theory']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
});

export type TutorStateType = typeof TutorState.State;
export type RouteDecision = z.infer<typeof RouteSchema>;
export type WorkerResult = z.infer<typeof WorkerResultSchema>;
export type AssessmentResult = z.infer<typeof AssessmentSchema>;
export type KnowledgeResult = z.infer<typeof KnowledgeResultSchema>;
