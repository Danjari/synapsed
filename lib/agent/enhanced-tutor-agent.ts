import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { MongoClient } from "mongodb";
import { TutorState } from "./enhanced-state";
import { orchestrator, synthesizer, responseEvaluator } from "./orchestrator";
import { 
  knowledgeWorker, 
  explanationWorker, 
  assessmentWorker, 
  exerciseWorker, 
  progressWorker 
} from "./workers";
import { tutorTools } from "./tools";

/**
 * Create the enhanced tutor agent with multi-worker architecture
 */
export async function createEnhancedTutorAgent(
  client: MongoClient, 
  classId?: string, 
  lessonId?: string,
  studentId?: string
) {
  console.log("🚀 Creating enhanced tutor agent with multi-worker architecture");

  // Initialize the main LLM
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0.7,
    maxOutputTokens: 2048,
  }).bindTools(tutorTools);

  // Define the main agent node
  async function callModel(state: typeof TutorState.State) {
    const systemPrompt = `You are an advanced AI tutor assistant with a comprehensive understanding of educational psychology and personalized learning. Your role is to:

1. **Provide personalized learning experiences** tailored to each student's level and needs
2. **Use multiple specialized workers** to deliver comprehensive educational support
3. **Maintain context and continuity** across conversations
4. **Encourage critical thinking** and active learning
5. **Adapt explanations** to different learning styles and preferences
6. **Track progress** and provide meaningful feedback

Current Context:
- Class ID: ${state.classId || 'Not specified'}
- Lesson ID: ${state.lessonId || 'Not specified'}
- Student ID: ${state.studentId || 'Not specified'}
- Student Level: ${state.studentLevel || 'intermediate'}
- Current Topic: ${state.currentTopic || 'Not specified'}
- Progress: ${state.progress || 0}%

Guidelines:
- Always be encouraging and supportive
- Use the available tools to provide accurate, up-to-date information
- Break down complex topics into digestible parts
- Ask clarifying questions when needed
- Remember context from previous interactions
- Provide actionable next steps for learning

The system will automatically route your responses through specialized workers to provide the most comprehensive and helpful assistance possible.`;

    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    
    // If this is the first message, route it through the orchestrator
    if (messages.length === 1) {
      console.log("🎯 First message detected, routing through orchestrator");
      return { messages: [lastMessage] };
    }
    
    // For subsequent messages, use the model directly
    const result = await model.invoke([
      { role: "system", content: systemPrompt },
      ...messages
    ]);
    
    return { messages: [result] };
  }

  // Build the enhanced workflow
  const workflow = new StateGraph(TutorState)
    // Main agent node
    .addNode("agent", callModel)
    
    // Orchestrator for routing and worker creation
    .addNode("orchestrator", orchestrator)
    
    // Specialized worker nodes
    .addNode("knowledgeWorker", knowledgeWorker)
    .addNode("explanationWorker", explanationWorker)
    .addNode("assessmentWorker", assessmentWorker)
    .addNode("exerciseWorker", exerciseWorker)
    .addNode("progressWorker", progressWorker)
    
    // Response synthesis
    .addNode("synthesizer", synthesizer)
    
    // Quality evaluation (optional)
    .addNode("evaluator", responseEvaluator)
    
    // Define the workflow edges
    .addEdge("__start__", "agent")
    
    // Route from agent to orchestrator for first message
    .addConditionalEdges(
      "agent",
      (state: typeof TutorState.State) => {
        // If this is the first message, go to orchestrator
        if (state.messages.length === 1) {
          return "orchestrator";
        }
        // Otherwise, end the conversation
        return "__end__";
      },
      ["orchestrator", "__end__"]
    )
    
    // From orchestrator to workers (handled by Send API)
    .addConditionalEdges(
      "orchestrator",
      (state: typeof TutorState.State) => {
        // This will be handled by the Send API in the orchestrator
        return "synthesizer";
      },
      ["synthesizer"]
    )
    
    // From workers to synthesizer
    .addEdge("knowledgeWorker", "synthesizer")
    .addEdge("explanationWorker", "synthesizer")
    .addEdge("assessmentWorker", "synthesizer")
    .addEdge("exerciseWorker", "synthesizer")
    .addEdge("progressWorker", "synthesizer")
    
    // From synthesizer to evaluator (optional quality check)
    .addConditionalEdges(
      "synthesizer",
      (state: typeof TutorState.State) => {
        // For now, skip evaluation and go directly to end
        // In production, you might want to add quality gates
        return "__end__";
      },
      ["evaluator", "__end__"]
    )
    
    // From evaluator to end
    .addEdge("evaluator", "__end__");

  // Set up memory with MongoDB checkpointing
  const checkpointer = new MongoDBSaver({ 
    client, 
    dbName: "synapsed" 
  });

  // Compile the agent with memory
  const app = workflow.compile({ checkpointer });

  console.log("✅ Enhanced tutor agent created successfully");
  return app;
}

/**
 * Call the enhanced tutor agent with comprehensive context
 */
export async function callEnhancedTutorAgent(
  client: MongoClient,
  query: string,
  threadId: string,
  classId?: string,
  lessonId?: string,
  studentId?: string,
  studentLevel?: 'beginner' | 'intermediate' | 'advanced',
  currentTopic?: string,
  progress?: number
) {
  try {
    console.log("🎓 Calling enhanced tutor agent with context:", {
      query: query.substring(0, 100) + "...",
      classId,
      lessonId,
      studentId,
      studentLevel,
      currentTopic,
      progress
    });

    const agent = await createEnhancedTutorAgent(client, classId, lessonId, studentId);
    
    const finalState = await agent.invoke(
      {
        messages: [{ role: "user", content: query }],
        classId,
        lessonId,
        studentId,
        studentLevel: studentLevel || 'intermediate',
        currentTopic,
        progress: progress || 0,
        context: {
          sessionStart: new Date().toISOString(),
          agentVersion: "enhanced-v1.0"
        }
      },
      { 
        recursionLimit: 15, // Increased for multi-worker processing
        configurable: { thread_id: threadId } 
      }
    );

    // Return the final response
    const response = finalState.finalResponse || 
                    finalState.messages[finalState.messages.length - 1]?.content ||
                    "I apologize, but I wasn't able to generate a response. Please try again.";

    console.log("✅ Enhanced tutor agent response generated");
    return response;
  } catch (error) {
    console.error("Error in enhanced tutor agent:", error);
    return "I apologize, but I encountered an error while processing your request. Please try again.";
  }
}

/**
 * Get conversation history with enhanced context
 */
export async function getEnhancedConversationHistory(
  client: MongoClient,
  threadId: string
) {
  try {
    const agent = await createEnhancedTutorAgent(client);
    const config = { configurable: { thread_id: threadId } };
    
    // Get the current state
    const state = await agent.getState(config);
    
    return {
      messages: state.values.messages || [],
      context: state.values.context || {},
      studentLevel: state.values.studentLevel,
      currentTopic: state.values.currentTopic,
      progress: state.values.progress,
      lastAction: state.values.lastAction
    };
  } catch (error) {
    console.error("Error getting conversation history:", error);
    return null;
  }
}
