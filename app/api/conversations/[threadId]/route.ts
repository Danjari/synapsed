import { NextRequest, NextResponse } from 'next/server';
import { ConversationService } from '@/lib/agent/conversation-service';

// Get a specific conversation by thread ID
export async function GET(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const { threadId } = params;

    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    const conversation = await ConversationService.getConversation(threadId);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error getting conversation:', error);
    return NextResponse.json({ 
      error: 'Failed to get conversation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Update conversation title
export async function PUT(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const { threadId } = params;
    const { title } = await req.json();

    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const conversation = await ConversationService.updateConversationTitle(threadId, title);

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json({ 
      error: 'Failed to update conversation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Delete a conversation
export async function DELETE(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const { threadId } = params;

    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    await ConversationService.deleteConversation(threadId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json({ 
      error: 'Failed to delete conversation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
