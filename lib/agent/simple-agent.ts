import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import * as z from "zod";
import { StateGraph, START, END } from "@langchain/langgraph";
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { MongoClient } from "mongodb";

// Define MessagesState schema
const MessagesState = z.object({
  messages: z.array(z.custom<BaseMessage>()),
});

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
async function callLlm(state: z.infer<typeof MessagesState>) {
  console.log('callLlm node invoked with messages:', state.messages);
  const result = await modelWithTools.invoke([
    new SystemMessage(
      "You are a helpful educational assistant for Synapsed. You help students and teachers with their academic needs."
    ),
    ...state.messages,
  ]);
  console.log('callLlm result:', result);
  return { messages: [result] };
}

// Define the tool call node
async function callTools(state: z.infer<typeof MessagesState>) {
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
function shouldContinue(state: z.infer<typeof MessagesState>): string {
  const lastMessage = state.messages[state.messages.length - 1];
  
  if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
    return "tools";
  }
  
  return END as string;
}

// Build the graph
const workflow = new (StateGraph as any)({ channels: MessagesState.shape } as any)
  .addNode("llm", callLlm)
  .addNode("tools", callTools)
  .addEdge(START, "llm")
  .addConditionalEdges("llm", shouldContinue as any, {
    tools: "tools",
    [END]: END,
  })
  .addEdge("tools", "llm");

// Initialize MongoDB checkpointer
let checkpointer: MongoDBSaver;
let mongoClient: MongoClient;

// Initialize MongoDB connection
async function initializeMongoDB() {
  if (!mongoClient) {
    const connectionString = process.env.DATABASE_URL || "mongodb://localhost:27017";
    mongoClient = new MongoClient(connectionString);
    await mongoClient.connect();
    checkpointer = new MongoDBSaver({ client: mongoClient });
  }
  return checkpointer;
}

// Initialize on module load
const checkpointerPromise = initializeMongoDB();

// Helper function to invoke the agent with a simple message
export async function invokeAgent(userMessage: string, threadId?: string) {
  try {
    console.log('Invoking agent with message:', userMessage, 'threadId:', threadId);
    
    // Ensure MongoDB is initialized
    const checkpointer = await checkpointerPromise;
    
    // Compile the agent with MongoDB checkpointer
    const agentWithMemory = workflow.compile({ checkpointer }) as any;
    
    // Pass config with thread_id if provided for memory
    const config = threadId ? { configurable: { thread_id: threadId } } : undefined;
    
    const result = await agentWithMemory.invoke(
      { messages: [new HumanMessage(userMessage)] },
      config
    ) as z.infer<typeof MessagesState>;
    
    console.log('Agent result:', result);
    
    // Log all messages to see what we got
    result.messages.forEach((msg: BaseMessage, index: number) => {
      console.log(`Message ${index}: type=${msg.constructor.name}, content=`, msg.content);
    });
    
    // Find the first AIMessage in the result
    const aiMessage = result.messages.find((msg: BaseMessage) => msg instanceof AIMessage);
    
    if (aiMessage) {
      console.log('Found AIMessage:', aiMessage);
      return aiMessage.content || "No content in AI message";
    }
    
    // If no AIMessage, return the last message
    const lastMessage = result.messages[result.messages.length - 1];
    console.log('No AIMessage found, last message:', lastMessage);
    
    if (!lastMessage) {
      console.error('No messages in result');
      return "No response generated - no messages returned";
    }
    
    const response = lastMessage.content || "No response generated - message has no content property";
    console.log('Returning response:', response);
    return response;
  } catch (error) {
    console.error('Error in invokeAgent:', error);
    throw error;
  }
}
