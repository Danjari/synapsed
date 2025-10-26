import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
//import { BaseMessage } from "@langchain/core/messages";
import { RouteSchema, TutorStateType } from "./enhanced-state";

// Initialize the LLM for routing decisions
const routerLlm = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  temperature: 0.3, // Lower temperature for more consistent routing
  maxOutputTokens: 512,
});

// Augment the LLM with structured output for routing
const structuredRouter = routerLlm.withStructuredOutput(RouteSchema);

/**
 * Intelligent routing function that analyzes student queries and determines
 * the best approach for handling them
 */
export async function routeQuery(state: TutorStateType): Promise<string> {
  try {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage || !lastMessage.content) {
      return "explanation"; // Default fallback
    }

    const query = lastMessage.content;
    const context = {
      classId: state.classId,
      lessonId: state.lessonId,
      currentTopic: state.currentTopic,
      studentLevel: state.studentLevel,
      lastAction: state.lastAction,
    };

    console.log("🧭 Routing query:", { query, context });

    const routingPrompt = `You are an intelligent routing system for an educational AI tutor. Analyze the student's query and determine the best approach to help them.

Student Query: "${query}"

Context:
- Class: ${context.classId || 'Not specified'}
- Lesson: ${context.lessonId || 'Not specified'}
- Current Topic: ${context.currentTopic || 'Not specified'}
- Student Level: ${context.studentLevel || 'Not specified'}
- Last Action: ${context.lastAction || 'None'}

Available Routes:
- "explanation": Student needs a clear explanation of a concept
- "assessment": Student needs to be assessed or wants to test their understanding
- "knowledge_search": Student is asking for specific information or facts
- "comprehensive": Student needs multiple types of help (explanation + assessment + examples)
- "clarification": Student is confused and needs clarification on previous responses
- "progress_check": Student wants to check their learning progress
- "exercise_help": Student needs help with exercises or practice problems

Consider:
1. The type of question being asked
2. The student's current level and context
3. Whether they seem confused or confident
4. What would be most helpful for their learning

Respond with the most appropriate route and explain your reasoning.`;

    const decision = await structuredRouter.invoke([
      { role: "system", content: routingPrompt },
      { role: "user", content: query }
    ]);

    console.log("🎯 Routing decision:", decision);

    // Update state with routing information
    state.lastAction = `routed_to_${decision.route}`;
    state.context = {
      ...state.context,
      routingDecision: decision,
      routingTimestamp: new Date().toISOString(),
    };

    return decision.route;
  } catch (error) {
    console.error("Error in routing:", error);
    // Fallback to explanation route
    return "explanation";
  }
}

/**
 * Determine which workers should be activated based on the routing decision
 */
export function getWorkersForRoute(route: string): string[] {
  const workerMapping: Record<string, string[]> = {
    explanation: ["explanationWorker"],
    assessment: ["assessmentWorker"],
    knowledge_search: ["knowledgeWorker"],
    comprehensive: ["knowledgeWorker", "explanationWorker", "assessmentWorker"],
    clarification: ["explanationWorker", "knowledgeWorker"],
    progress_check: ["progressWorker"],
    exercise_help: ["exerciseWorker", "explanationWorker"],
  };

  return workerMapping[route] || ["explanationWorker"];
}

/**
 * Check if the query needs clarification
 */
export function needsClarification(state: TutorStateType): boolean {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  
  if (!lastMessage || !lastMessage.content) {
    return false;
  }

  const query = (typeof lastMessage.content === 'string' ? lastMessage.content : String(lastMessage.content)).toLowerCase();
  
  // Check for clarification indicators
  const clarificationIndicators = [
    "i don't understand",
    "i'm confused",
    "can you explain",
    "what do you mean",
    "i'm not sure",
    "help me understand",
    "i'm lost",
    "this doesn't make sense",
    "can you clarify",
    "i need help",
  ];

  return clarificationIndicators.some(indicator => query.includes(indicator));
}

/**
 * Determine if the student is asking for assessment
 */
export function isAssessmentQuery(state: TutorStateType): boolean {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  
  if (!lastMessage || !lastMessage.content) {
    return false;
  }

  const query = (typeof lastMessage.content === 'string' ? lastMessage.content : String(lastMessage.content)).toLowerCase();
  
  const assessmentIndicators = [
    "test me",
    "quiz me",
    "do i understand",
    "am i right",
    "check my understanding",
    "assess me",
    "evaluate",
    "how well do i know",
    "test my knowledge",
  ];

  return assessmentIndicators.some(indicator => query.includes(indicator));
}

/**
 * Determine if the student needs comprehensive help
 */
export function needsComprehensiveHelp(state: TutorStateType): boolean {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  
  if (!lastMessage || !lastMessage.content) {
    return false;
  }

  const query = (typeof lastMessage.content === 'string' ? lastMessage.content : String(lastMessage.content)).toLowerCase();
  
  const comprehensiveIndicators = [
    "explain everything",
    "teach me",
    "help me learn",
    "i want to understand",
    "comprehensive explanation",
    "full explanation",
    "complete understanding",
  ];

  return comprehensiveIndicators.some(indicator => query.includes(indicator));
}
