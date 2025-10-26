import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { callEnhancedTutorAgent } from '@/lib/agent/enhanced-tutor-agent';
import { callTutorAgent } from '@/lib/agent/tutor-agent';
import { ConversationService } from '@/lib/agent/conversation-service';




// Initialize MongoDB client
const client = new MongoClient(process.env.DATABASE_URL!);

// Main API handler
export async function POST(req: NextRequest) {
  try {
    const { 
      messages, 
      threadId, 
      classId, 
      lessonId, 
      userId, 
      studentId,
      studentLevel,
      currentTopic,
      progress,
      useEnhanced = true
    } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      return NextResponse.json({ error: 'Last message must be from user' }, { status: 400 });
    }

    console.log(lastMessage.content);
    // Convert message content to string safely
    const messageContent: string = String(lastMessage.content);

    // Connect to MongoDB
    await client.connect();
    
    try {
      let response: string;
      
      if (useEnhanced) {
        // Use our sophisticated enhanced tutor agent with all the LangGraph components
        response = await callEnhancedTutorAgent(
          client,
          messageContent,
          threadId,
          classId,
          lessonId,
          studentId || userId, // Use studentId if provided, fallback to userId
          studentLevel,
          currentTopic,
          progress
        );
      } else {
        // Fallback to original tutor agent
        response = await callTutorAgent(
          client,
          messageContent,
          threadId
        );
      }

      // Save conversation to database if userId is provided
      if (userId) {
        try {
          await ConversationService.saveConversation({
            threadId,
            userId,
            classId,
            lessonId,
            title: messages.length === 1 ? messageContent.substring(0, 50) + '...' : undefined,
            messages: [
              ...messages.map(msg => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                timestamp: new Date()
              })),
              {
                role: 'assistant' as const,
                content: response,
                timestamp: new Date()
              }
            ]
          });
        } catch (dbError) {
          console.error('Error saving conversation to database:', dbError);
          // Don't fail the request if database save fails
        }
      }

      return NextResponse.json({ 
        message: response,
        threadId,
        timestamp: new Date().toISOString(),
        enhanced: useEnhanced,
        context: {
          classId,
          lessonId,
          studentLevel,
          currentTopic,
          progress
        }
      });
    } finally {
      // Don't close the client here as it's reused
    }
  } catch (error) {
    console.error('Error in agent chat API:', error);
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
