import { NextRequest, NextResponse } from 'next/server';
import { invokeAgent } from '@/lib/agent/simple-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received request body:', body);
    
    // Support both old format (message) and new format (messages array)
    const { message, messages } = body;

    // If using the new format with messages array, extract the last user message
    let userMessage: string;
    if (messages && Array.isArray(messages)) {
      // Get the last message from the user
      const lastUserMessage = messages.filter((m: { role: string; content: string }) => m.role === 'user').pop();
      if (!lastUserMessage) {
        return NextResponse.json(
          { error: 'No user message found in messages array' },
          { status: 400 }
        );
      }
      userMessage = lastUserMessage.content;
    } else if (message && typeof message === 'string') {
      userMessage = message;
    } else {
      return NextResponse.json(
        { error: 'Either "message" or "messages" array with user messages is required' },
        { status: 400 }
      );
    }

    const response = await invokeAgent(userMessage, body.threadId);

    console.log('Agent response RETURNED BY THE AGENT:', response);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Agent error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
