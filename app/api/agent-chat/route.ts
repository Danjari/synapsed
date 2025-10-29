import { NextRequest, NextResponse } from 'next/server';
import { invokeAgent } from '@/lib/agent/simple-agent';
import { ConversationService } from '@/lib/agent/conversation-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Support both old format (message) and new format (messages array)
    const { message, messages, userId, classId, lessonId, threadId } = body;

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

    // Get or create conversation for persistence
    let conversation;
    if (userId) {
      conversation = await ConversationService.getOrCreateConversation({
        userId,
        classId,
        lessonId,
        threadId, // Use provided threadId if exists, otherwise service will generate
      });

      // Save user message to database
      await ConversationService.saveMessage({
        conversationId: conversation.id,
        role: 'USER',
        content: userMessage,
      });
    }

    // Use conversation's threadId if available, otherwise use provided threadId
    const agentThreadId = conversation?.threadId || threadId;

    // Invoke agent with the threadId for memory continuity
    const response = await invokeAgent(userMessage, agentThreadId);

    // Save assistant message to database if conversation exists
    if (conversation) {
      await ConversationService.saveMessage({
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: response,
      });
    }

    return NextResponse.json({
      response,
      conversationId: conversation?.id,
      threadId: agentThreadId,
    });
  } catch (error) {
    console.error('Agent error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
