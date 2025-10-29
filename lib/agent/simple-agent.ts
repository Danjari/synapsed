import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import * as z from "zod";
import { StateGraph, START, END } from "@langchain/langgraph";
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { MongoClient } from "mongodb";

// Define MessagesState with channel configuration for proper memory
interface MessagesState {
  messages: BaseMessage[];
}

// Initialize the model
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash-exp",
  temperature: 0,
  apiKey: process.env.GEMINI_API_KEY,
});

// Define some simple tools for testing
const getStudentProgress = new DynamicStructuredTool({
  name: "getStudentProgress",
  description: "Get the progress of a student in a class",
  schema: z.object({
    studentId: z.string().describe("The ID of the student"),
    classId: z.string().describe("The ID of the class"),
  }),
  func: async (input) => {
    const { studentId, classId } = input as { studentId: string; classId: string };
    return `Student ${studentId} in class ${classId} has completed 75% of assignments`;
  },
});

const getClassResources = new DynamicStructuredTool({
  name: "getClassResources",
  description: "Get all available resources for a class",
  schema: z.object({
    classId: z.string().describe("The ID of the class"),
  }),
  func: async (input) => {
    const { classId } = input as { classId: string };
    return `Class ${classId} has 5 documents, 3 assignments, and 2 quizzes available`;
  },
});

const getFlashcards = new DynamicStructuredTool({
  name: "getFlashcards",
  description: "Generate flashcards for a specific topic",
  schema: z.object({
    topic: z.string().describe("The topic to generate flashcards for"),
  }),
  func: async (input) => {
    const { topic } = input as { topic: string };
    return `Generated 10 flashcards for the topic: ${topic}`;
  },
});

// Create tools map
const toolsByName: Record<string, DynamicStructuredTool> = {
  [getStudentProgress.name]: getStudentProgress,
  [getClassResources.name]: getClassResources,
  [getFlashcards.name]: getFlashcards,
};

const tools = Object.values(toolsByName);
const modelWithTools = model.bindTools(tools);

// Define the LLM call node
async function callLlm(state: MessagesState) {
  const result = await modelWithTools.invoke([
    new SystemMessage(
      "You are a helpful educational assistant for Synapsed. You help students and teachers with their academic needs."
    ),
    ...state.messages,
  ]);
  return { messages: [result] };
}

// Define the tool call node
async function callTools(state: MessagesState) {
  const lastMessage = state.messages[state.messages.length - 1];
  
  if (!(lastMessage instanceof AIMessage) || !lastMessage.tool_calls?.length) {
    return { messages: [] };
  }

  const toolResults = await Promise.all(
    lastMessage.tool_calls.map(async (toolCall) => {
      const tool = toolsByName[toolCall.name];
      if (!tool) {
        return new ToolMessage({
          content: `Tool ${toolCall.name} not found`,
          tool_call_id: toolCall.id || '',
        });
      }
      const result = await tool.invoke(toolCall);
      return new ToolMessage({
        content: JSON.stringify(result),
        tool_call_id: toolCall.id || '',
      });
    })
  );

  return { messages: toolResults };
}

// Define the should continue function
function shouldContinue(state: MessagesState): string {
  const lastMessage = state.messages[state.messages.length - 1];
  
  if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
    return "tools";
  }
  
  return END as string;
}

// Build the graph with proper memory channel configuration
const workflow = new StateGraph({
  channels: {
    messages: {
      reducer: (x: BaseMessage[] = [], y: BaseMessage[] = []) => {
        const arr = Array.isArray(y) ? y : [y];
        return [...x, ...arr];
      },
      default: () => [],
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- LangGraph StateGraph type requires this due to version mismatch
} as any)
  .addNode("llm", callLlm)
  .addNode("tools", callTools)
  .addEdge(START, "llm")
  .addConditionalEdges("llm", shouldContinue, {
    tools: "tools",
    [END]: END,
  })
  .addEdge("tools", "llm");

// Initialize MongoDB checkpointer
let checkpointer: MongoDBSaver;
let mongoClient: MongoClient;

// Initialize MongoDB connection (similar to PostgresSaver.fromConnString)
async function initializeMongoDB() {
  if (!mongoClient) {
    const connectionString = process.env.DATABASE_URL || "mongodb://localhost:27017";
    mongoClient = new MongoClient(connectionString);
    await mongoClient.connect();
    checkpointer = new MongoDBSaver({ client: mongoClient });
    // await checkpointer.setup(); // Uncomment if MongoDB needs setup like Postgres
  }
  return checkpointer;
}

// Compile agent once with MongoDB checkpointer
// Using ReturnType to infer the compiled graph type
type CompiledAgent = ReturnType<typeof workflow.compile>;
let compiledAgent: CompiledAgent | null = null;
let compilationPromise: Promise<CompiledAgent> | null = null;

async function getCompiledAgent(): Promise<CompiledAgent> {
  if (!compiledAgent) {
    if (!compilationPromise) {
      compilationPromise = (async () => {
        const checkpointer = await initializeMongoDB();
        compiledAgent = workflow.compile({ checkpointer });
        return compiledAgent;
      })();
    }
    await compilationPromise;
  }
  if (!compiledAgent) {
    throw new Error('Failed to compile agent');
  }
  return compiledAgent;
}

// Helper function to invoke the agent with a simple message
export async function invokeAgent(userMessage: string, threadId?: string) {
  try {
    // Get compiled agent (will compile once on first call)
    const agent = await getCompiledAgent();
    
    // Pass config with thread_id if provided for memory
    const config = threadId ? { configurable: { thread_id: threadId } } : { configurable: {} };
    
    // Pass only the new message - the reducer will merge with previous messages from checkpointer
    const result = await agent.invoke(
      { messages: [new HumanMessage(userMessage)] },
      config
    );
    
    // Find the LAST AIMessage in the result (the most recent response)
    const aiMessages = result.messages.filter((msg: BaseMessage) => msg instanceof AIMessage);
    const aiMessage = aiMessages[aiMessages.length - 1];
    
    if (aiMessage) {
      return aiMessage.content || "No content in AI message";
    }
    
    // If no AIMessage, return the last message
    const lastMessage = result.messages[result.messages.length - 1];
    
    if (!lastMessage) {
      return "No response generated - no messages returned";
    }
    
    return lastMessage.content || "No response generated - message has no content property";
  } catch (error) {
    console.error('Error in invokeAgent:', error);
    throw error;
  }
}
