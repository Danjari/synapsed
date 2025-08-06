import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export async function callOpenAI(prompt: string) {
  const model = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    maxTokens: 500,
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const response = await model.invoke([
      ["system", "You are a helpful AI assistant."],
      ["human", prompt]
    ]);
    
    return response.content as string;
  } catch (error) {
    throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function callClaude(prompt: string) {
  const model = new ChatAnthropic({
    modelName: "claude-3-sonnet-20240229",
    maxTokens: 500,
    temperature: 0.7,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    const response = await model.invoke([
      ["human", prompt]
    ]);
    
    return response.content as string;
  } catch (error) {
    throw new Error(`Claude API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function callGemini(prompt: string) {
  const model = new ChatGoogleGenerativeAI({
    modelName: "gemini-pro",
    maxOutputTokens: 500,
    temperature: 0.7,
    googleApiKey: process.env.GOOGLE_API_KEY,
  });

  try {
    const response = await model.invoke([
      ["human", prompt]
    ]);
    
    return response.content as string;
  } catch (error) {
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
