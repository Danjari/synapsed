import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import * as z from "zod";
import { StateGraph, START, END } from "@langchain/langgraph";
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { MongoClient } from "mongodb";
import { searchClassContent } from "./tools/searchClassContent";
import { createInChatAssessment } from "./tools/createInChatAssessment";
import { GEMINI_MODEL } from "@/lib/gemini-model";

// Define MessagesState with channel configuration for proper memory
interface MessagesState {
  messages: BaseMessage[];
}

// Context for tool invocations
interface ToolContext {
  conversationId?: string;
  classId?: string;
  lessonId?: string;
  userId?: string;
}

let currentToolContext: ToolContext = {};

// Source metadata type
export interface SourceMetadata {
  title: string;
  page?: number | string;
  materialId?: string;
  classId?: string;
}

// Agent response type
export interface AgentResponse {
  content: string;
  sources?: SourceMetadata[];
  inChatAssessmentData?: InChatAssessmentData; // Formedible in-chat assessment configuration
}

// Initialize the model
const model = new ChatGoogleGenerativeAI({
  model: GEMINI_MODEL,
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

// Create tools map
const toolsByName: Record<string, DynamicStructuredTool> = {
  [getStudentProgress.name]: getStudentProgress,
  [getClassResources.name]: getClassResources,
  [searchClassContent.name]: searchClassContent,
  [createInChatAssessment.name]: createInChatAssessment,
};

const tools = Object.values(toolsByName);
const modelWithTools = model.bindTools(tools);

// Define the LLM call node
async function callLlm(state: MessagesState) {
  // Filter out any existing SystemMessages from the history to avoid duplicates
  // We check both instanceof and the type string to be safe against serialization issues
  const history = state.messages.filter(msg => {
    const isSystem = msg instanceof SystemMessage || msg._getType() === 'system';
    return !isSystem;
  });

  const result = await modelWithTools.invoke([
    new SystemMessage(`
You are a highly capable educational assistant for Synapsed, designed to help students learn effectively.

### YOUR CORE DIRECTIVES:
1.  **GROUNDING & TOOL USAGE**:
    *   **CRITICAL**: When explicitly instructed to use \`searchClassContent\` tool, you MUST call it immediately before responding. Do not skip this step.
    *   **Class-Specific Questions**: When asked about specific concepts, definitions, or materials defined in this class, **YOU MUST** use the \`searchClassContent\` tool to ensure accuracy.
    *   **General/Conversational**: For greetings, general study advice, or simple clarifications that don't require specific class context, you may answer directly without tools to save time.
    *   **Uncertainty**: If you are unsure if a term has a specific meaning in this class context, err on the side of using the tool.
    *   **Tool Responses**: Tool responses contain clean, natural text content. Use this information naturally in your responses without including citations or source references.
    *   **IMPORTANT**: Do NOT include source citations (like "Source: ..." or "Page X") in your response. Sources are tracked automatically by the system and displayed separately to the user in a tooltip.

2.  **TEACHING STYLE (SOCRATIC)**:
    *   **DO NOT** simply give answers to homework or complex conceptual questions.
    *   **GUIDE** the student. Ask probing questions to help them arrive at the answer themselves.
    *   Break down complex topics into smaller, digestible steps.

3.  **ADAPTABILITY**:
    *   Tailor your explanations to the student's level.
    *   Use analogies and examples to clarify difficult concepts.

4.  **TOOL USAGE**:
    *   Use \`getStudentProgress\` to understand where the student is in the course.
    *   Use \`getClassResources\` to recommend materials.

5.  **IN-CHAT ASSESSMENT & UNDERSTANDING EVALUATION**:
    *   **When to Assess**: After explaining a concept or topic, assess the student's understanding by using the \`createInChatAssessment\` tool.
    *   **Assessment Timing**: Use in-chat assessments when:
        - You've just explained a complex concept
        - The student seems to understand but you want to verify
        - The student asks to test their knowledge
        - You want to reinforce learning through practice
    *   **How to Use**: Call \`createInChatAssessment\` with the topic, nodeTitle (if available), questionCount (2-5 questions is ideal), and appropriate difficulty level.
    *   **After Assessment**: Once the student completes the in-chat assessment, provide constructive feedback on their answers, highlighting what they understood well and areas for improvement.
    *   **Continue Learning**: After feedback, continue the conversation naturally, addressing any gaps in understanding.
`),
    ...history,
  ]);
  
  return { messages: [result] };
}

// Map to store sources extracted from tool results, keyed by tool_call_id
// This allows us to separate sources from content - LLM gets clean text, we track sources separately
const toolSourcesMap = new Map<string, SourceMetadata[]>();

// Map to store in-chat assessment data from createInChatAssessment tool, keyed by tool_call_id
interface InChatAssessmentData {
  type: string;
  topic: string;
  nodeTitle?: string;
  difficulty: string;
  fields: unknown[];
  schema: unknown;
  correctAnswers: Record<string, unknown>;
}
const toolInChatAssessmentMap = new Map<string, InChatAssessmentData>();

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
      
      // Inject context into tool call args for createInChatAssessment
      let toolCallInput = toolCall.args || {};
      if (toolCall.name === 'createInChatAssessment') {
        toolCallInput = {
          ...toolCallInput,
          conversationId: currentToolContext.conversationId,
          classId: currentToolContext.classId,
          lessonId: currentToolContext.lessonId,
        };
      }
      
      const result = await tool.invoke(toolCallInput);
      
      // Handle different return types
      let content: string;
      const toolCallId = toolCall.id || '';
      
      if (typeof result === 'string') {
        content = result;
        // No sources for string results
        toolSourcesMap.delete(toolCallId);
      } else if (result && typeof result === 'object' && result !== null && 'content' in result) {
        // Extract sources if present and store them separately
        const hasSources = 'sources' in result;
        const sourcesIsArray = hasSources && Array.isArray(result.sources);
        
        if (hasSources && sourcesIsArray) {
          const sourcesMetadata = result.sources as SourceMetadata[];
          toolSourcesMap.set(toolCallId, sourcesMetadata);
        } else {
          // No sources, clear any previous entry
          toolSourcesMap.delete(toolCallId);
        }
        
        // Extract in-chat assessment data if present (from createInChatAssessment tool)
        if ('inChatAssessmentData' in result && result.inChatAssessmentData) {
          toolInChatAssessmentMap.set(toolCallId, result.inChatAssessmentData);
        } else {
          toolInChatAssessmentMap.delete(toolCallId);
        }
        
        // Give LLM ONLY the content string - clean, natural text without JSON structure
        content = result.content as string;
      } else {
        content = JSON.stringify(result);
        toolSourcesMap.delete(toolCallId);
      }
      
      return new ToolMessage({
        content: content,
        tool_call_id: toolCallId,
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

// Helper function to extract sources from tool messages
// Sources are stored separately in toolSourcesMap, keyed by tool_call_id
function extractSourcesFromMessages(messages: BaseMessage[]): SourceMetadata[] {
  const sources: SourceMetadata[] = [];
  const seenSources = new Set<string>();

  for (const msg of messages) {
    // Check message type - handle both instanceof and type string (for serialized messages)
    const isToolMessage = msg instanceof ToolMessage || msg._getType() === 'tool';
    
    if (isToolMessage) {
      // Get tool_call_id from the ToolMessage
      let toolCallId: string | undefined;
      
      if (msg instanceof ToolMessage) {
        toolCallId = msg.tool_call_id;
      } else {
        // For serialized messages, try to extract tool_call_id
        try {
          const msgStr = typeof msg.content === 'string' ? msg.content : String(msg.content);
          const parsed = JSON.parse(msgStr);
          if (parsed.kwargs && parsed.kwargs.tool_call_id) {
            toolCallId = parsed.kwargs.tool_call_id;
          }
        } catch {
          // Not JSON, skip
        }
      }
      
      if (toolCallId && toolSourcesMap.has(toolCallId)) {
        const toolSources = toolSourcesMap.get(toolCallId) || [];
        
        for (const source of toolSources) {
          // Create a unique key to avoid duplicates
          const key = `${source.title}-${source.page}-${source.materialId || ''}`;
          if (!seenSources.has(key)) {
            seenSources.add(key);
            const sourceMetadata = {
              title: source.title || "Unknown Source",
              page: source.page,
              materialId: source.materialId,
              classId: source.classId,
            };
            sources.push(sourceMetadata);
          }
        }
      }
    }
  }

  return sources;
}

// Helper function to invoke the agent with a simple message
export async function invokeAgent(userMessage: string, threadId?: string, classId?: string, userId?: string, conversationId?: string): Promise<AgentResponse> {
  try {
    // Get compiled agent (will compile once on first call)
    const agent = await getCompiledAgent();

    // Pass config with thread_id if provided for memory
    // Ensure config is always a valid object (MongoDB checkpointer requires this)
    const config = threadId 
      ? { configurable: { thread_id: threadId } } 
      : { configurable: { thread_id: `temp-${Date.now()}-${Math.random()}` } };

    // Prepare the input messages
    const messages: BaseMessage[] = [];

    // Store context for tool invocations
    currentToolContext = {
      conversationId,
      classId,
      lessonId: classId, // Using classId as lessonId fallback
      userId,
    };

    // Context Injection
    let fullUserMessage = userMessage;
    if (classId || userId) {
      const contextMsg = `[System Context]\n${classId ? `- Class ID: ${classId}\n` : ""}${userId ? `- Student ID: ${userId}\n` : ""}${conversationId ? `- Conversation ID: ${conversationId}\n` : ""}[End Context]\n\n`;
      fullUserMessage = contextMsg + userMessage;
    }

    messages.push(new HumanMessage(fullUserMessage));

    // Pass only the new message - the reducer will merge with previous messages from checkpointer
    const result = await agent.invoke(
      { messages },
      config
    );

    // Extract sources from tool messages
    const sources = extractSourcesFromMessages(result.messages);
    
    // Extract in-chat assessment data from tool messages
    let inChatAssessmentData: InChatAssessmentData | undefined = undefined;
    const toolCallIdsInResult = new Set<string>();
    for (const msg of result.messages) {
      if (msg instanceof ToolMessage) {
        if (msg.tool_call_id) {
          toolCallIdsInResult.add(msg.tool_call_id);
          // Check if this tool call has in-chat assessment data
          if (toolInChatAssessmentMap.has(msg.tool_call_id)) {
            inChatAssessmentData = toolInChatAssessmentMap.get(msg.tool_call_id);
          }
        }
      }
    }
    // Clean up maps for tool calls in this result to prevent memory leaks
    // (Keep them until after extraction, then clean up)
    for (const toolCallId of toolCallIdsInResult) {
      toolSourcesMap.delete(toolCallId);
      toolInChatAssessmentMap.delete(toolCallId);
    }

    // Find the LAST AIMessage in the result (the most recent response)
    const aiMessages = result.messages.filter((msg: BaseMessage) => msg instanceof AIMessage);
    const aiMessage = aiMessages[aiMessages.length - 1];

    // Helper function to extract string content from message content (which can be string or array)
    const extractContent = (msgContent: string | string[] | undefined): string => {
      if (!msgContent) return "";
      if (typeof msgContent === "string") return msgContent;
      if (Array.isArray(msgContent)) {
        // Join array elements, filtering out non-string types
        return msgContent
          .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
          .join("\n");
      }
      return String(msgContent);
    };

    let content: string;
    if (aiMessage) {
      const extracted = extractContent(aiMessage.content);
      content = extracted || "No content in AI message";
    } else {
      // If no AIMessage, return the last message
      const lastMessage = result.messages[result.messages.length - 1];
      if (!lastMessage) {
        content = "No response generated - no messages returned";
      } else {
        const extracted = extractContent(lastMessage.content);
        content = extracted || "No response generated - message has no content property";
      }
    }

    const response = {
      content,
      sources: sources.length > 0 ? sources : undefined,
      inChatAssessmentData,
    };

    return response;
  } catch (error) {
    console.error('Error in invokeAgent:', error);
    throw error;
  }
}

// Helper function to stream the agent response
export async function streamAgent(userMessage: string, threadId?: string, classId?: string, userId?: string) {
  try {
    const agent = await getCompiledAgent();
    const config = threadId ? { configurable: { thread_id: threadId } } : { configurable: {} };
    const messages: BaseMessage[] = [];

    let fullUserMessage = userMessage;
    if (classId || userId) {
      const contextMsg = `[System Context]\n${classId ? `- Class ID: ${classId}\n` : ""}${userId ? `- Student ID: ${userId}\n` : ""}[End Context]\n\n`;
      fullUserMessage = contextMsg + userMessage;
    }

    messages.push(new HumanMessage(fullUserMessage));

    // Return the stream directly
    return await agent.streamEvents(
      { messages },
      { ...config, version: "v2" }
    );
  } catch (error) {
    console.error('Error in streamAgent:', error);
    throw error;
  }
}
