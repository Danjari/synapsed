import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { MongoClient } from "mongodb";
import { tutorTools } from "./tools";
import "dotenv/config";

// Define the agent state
const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  classId: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
  }),
  lessonId: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
  }),
});

export async function createTutorAgent(client: MongoClient) {
  // Initialize the chat model with Gemini
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0.7,
    maxOutputTokens: 2048,
  }).bindTools(tutorTools);

  // Create tool node
  const toolNode = new ToolNode<typeof GraphState.State>(tutorTools);

  // Define the agent's behavior
  async function callModel(state: typeof GraphState.State) {
    const systemPrompt = `You are an AI tutor assistant with a warm, encouraging, and educational personality. Your role is to:

1. **Help students learn** by providing clear, step-by-step explanations
2. **Be patient and supportive** - never make students feel bad for asking questions
3. **Use the available tools** to search through lesson materials and provide accurate information
4. **Remember important conversation points** for better context
5. **Adapt your explanations** to the student's level and needs
6. **Encourage critical thinking** by asking follow-up questions when appropriate

Guidelines:
- Always be encouraging and positive
- Break down complex topics into digestible parts
- Use examples and analogies when helpful
- Ask clarifying questions if the student's question is unclear
- Reference specific lesson materials when available
- Remember context from previous messages in the conversation

Current context:
- Class ID: ${state.classId || 'Not specified'}
- Lesson ID: ${state.lessonId || 'Not specified'}

Use the available tools to search for relevant information and provide comprehensive, helpful responses.`;

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      new MessagesPlaceholder("messages"),
    ]);

    const formattedPrompt = await prompt.formatMessages({
      messages: state.messages,
    });

    const result = await model.invoke(formattedPrompt);
    return { messages: [result] };
  }

  // Determine whether to continue or end
  function shouldContinue(state: typeof GraphState.State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1] as AIMessage;
    
    if (lastMessage.tool_calls?.length) {
      return "tools";
    }
    return "__end__";
  }

  // Build the workflow
  const workflow = new StateGraph(GraphState)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

  // Set up memory with MongoDB checkpointing
  const checkpointer = new MongoDBSaver({ 
    client, 
    dbName: "synapsed" 
  });

  // Compile the agent with memory
  const app = workflow.compile({ checkpointer });

  return app;
}

export async function callTutorAgent(
  client: MongoClient,
  query: string,
  threadId: string,
  classId?: string,
  lessonId?: string
) {
  try {
    const agent = await createTutorAgent(client);
    
    const finalState = await agent.invoke(
      {
        messages: [new HumanMessage(query)],
        classId,
        lessonId,
      },
      { 
        recursionLimit: 10, 
        configurable: { thread_id: threadId } 
      }
    );

    const lastMessage = finalState.messages[finalState.messages.length - 1];
    return lastMessage.content;
  } catch (error) {
    console.error("Error in tutor agent:", error);
    return "I apologize, but I encountered an error while processing your request. Please try again.";
  }
}
