import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invokeAgent } from '@/lib/agent/simple-agent';
import { ConversationService } from '@/lib/agent/conversation-service';

export async function POST(request: NextRequest) {
  console.log('[Assessment Submit] Request received');
  try {
    const body = await request.json();
    console.log('[Assessment Submit] Body parsed:', {
      hasAssessmentId: !!body.assessmentId,
      hasInChatAssessmentData: !!body.inChatAssessmentData,
      hasResponses: !!body.responses,
      hasConversationId: !!body.conversationId,
      hasClassId: !!body.classId,
      hasLessonId: !!body.lessonId,
      hasUserId: !!body.userId,
    });
    
    const {
      assessmentId,
      inChatAssessmentData,
      responses,
      conversationId,
      classId,
      lessonId,
      userId,
    } = body;

    if (!inChatAssessmentData || !responses || !userId) {
      console.error('[Assessment Submit] Missing required fields:', {
        hasInChatAssessmentData: !!inChatAssessmentData,
        hasResponses: !!responses,
        hasUserId: !!userId,
      });
      return NextResponse.json(
        { error: 'Missing required fields: inChatAssessmentData, responses, or userId' },
        { status: 400 }
      );
    }
    
    console.log('[Assessment Submit] Starting assessment processing:', {
      topic: inChatAssessmentData.topic,
      conversationId,
      userId,
    });

    // First, get conversation to determine actualConversationId before creating assessment
    // Note: conversationId might actually be a threadId (from frontend)
    console.log('[Assessment Submit] Getting conversation first:', { conversationId, userId });
    let conversation = null;
    let threadId: string | undefined = undefined;
    let actualConversationId: string | null = null;
    
    if (conversationId) {
      // Check if conversationId is actually a threadId (starts with "thread_")
      if (conversationId.startsWith('thread_')) {
        console.log('[Assessment Submit] conversationId is actually a threadId, looking up by threadId');
        conversation = await ConversationService.getConversationByThreadId(conversationId);
        if (conversation) {
          threadId = conversation.threadId;
          actualConversationId = conversation.id;
          console.log('[Assessment Submit] Found conversation by threadId:', { 
            conversationId: conversation.id, 
            threadId 
          });
        } else {
          console.log('[Assessment Submit] Conversation not found by threadId:', conversationId);
        }
      } else {
        // Try to find by actual conversation ID (ObjectId)
        conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });
        if (conversation) {
          threadId = conversation.threadId;
          actualConversationId = conversation.id;
          console.log('[Assessment Submit] Found conversation by ID:', { conversationId, threadId });
        } else {
          console.log('[Assessment Submit] Conversation not found by ID:', conversationId);
        }
      }
    }
    
    // If no conversation found but we have userId, get or create one
    if (!conversation && userId) {
      console.log('[Assessment Submit] Creating/getting conversation for user');
      conversation = await ConversationService.getOrCreateConversation({
        userId,
        classId: classId || undefined,
        lessonId: lessonId || undefined,
        threadId: conversationId?.startsWith('thread_') ? conversationId : undefined,
      });
      threadId = conversation.threadId;
      actualConversationId = conversation.id;
      console.log('[Assessment Submit] Conversation ready:', { 
        conversationId: conversation.id, 
        threadId 
      });
    }

    // Create or find in-chat assessment record
    console.log('[Assessment Submit] Looking up assessment:', { assessmentId });
    let assessment;
    if (assessmentId) {
      assessment = await prisma.inChatAssessment.findUnique({
        where: { id: assessmentId },
      });
      console.log('[Assessment Submit] Found existing assessment:', !!assessment);
    }

    if (!assessment) {
      console.log('[Assessment Submit] Creating new assessment record');
      // Create new in-chat assessment record
      // Use actualConversationId (ObjectId) if we found a conversation, otherwise null
      // Don't use conversationId directly as it might be a threadId
      assessment = await prisma.inChatAssessment.create({
        data: {
          topic: inChatAssessmentData.topic,
          nodeTitle: inChatAssessmentData.nodeTitle || null,
          fields: inChatAssessmentData.fields,
          schema: inChatAssessmentData.schema,
          correctAnswers: inChatAssessmentData.correctAnswers || {},
          conversationId: actualConversationId || null, // Use actual ObjectId, not threadId
          nodeId: lessonId || null,
        },
      });
      console.log('[Assessment Submit] Assessment created:', assessment.id);
    }

    // Calculate score if correct answers are provided
    console.log('[Assessment Submit] Calculating score');
    let score: number | null = null;
    if (inChatAssessmentData.correctAnswers) {
      const correctAnswers = inChatAssessmentData.correctAnswers;
      let correctCount = 0;
      let totalQuestions = 0;

      Object.keys(correctAnswers).forEach((key) => {
        totalQuestions++;
        const correctAnswer = correctAnswers[key];
        const studentAnswer = responses[key];

        if (Array.isArray(correctAnswer)) {
          // MultiSelect: Check if student selected all correct answers
          const studentArray = Array.isArray(studentAnswer) ? studentAnswer : [];
          const correctArray = correctAnswer.map(String);
          const studentArrayStr = studentArray.map(String);
          
          // Check if arrays match (same length and same values)
          if (studentArrayStr.length === correctArray.length &&
              correctArray.every(val => studentArrayStr.includes(val))) {
            correctCount++;
          }
        } else if (typeof correctAnswer === 'boolean') {
          // Checkbox: Exact boolean match
          if (studentAnswer === correctAnswer) {
            correctCount++;
          }
        } else if (typeof correctAnswer === 'number') {
          // Number: Exact numeric match
          const studentNum = typeof studentAnswer === 'number' ? studentAnswer : parseFloat(String(studentAnswer));
          if (!isNaN(studentNum) && studentNum === correctAnswer) {
            correctCount++;
          }
        } else {
          // Text, textarea, select, radio: String comparison (case-insensitive, trimmed)
          const studentStr = String(studentAnswer).toLowerCase().trim();
          const correctStr = String(correctAnswer).toLowerCase().trim();
          
          // For textarea, also check if answer contains key phrases
          const field = inChatAssessmentData.fields.find((f: { name: string }) => f.name === key);
          if (field?.type === 'textarea') {
            // For textarea, check if student answer contains the correct answer or vice versa
            if (studentStr.includes(correctStr) || correctStr.includes(studentStr)) {
              correctCount++;
            }
          } else {
            // Exact match for other types
            if (studentStr === correctStr) {
              correctCount++;
            }
          }
        }
      });

      if (totalQuestions > 0) {
        score = (correctCount / totalQuestions) * 100;
      }
    }
    console.log('[Assessment Submit] Score calculated:', score);
    
    // Save in-chat assessment response (this is independent of conversation, so save immediately)
    console.log('[Assessment Submit] Saving assessment response');
    const assessmentResponse = await prisma.inChatAssessmentResponse.create({
      data: {
        assessmentId: assessment.id,
        studentId: userId,
        responses,
        score,
      },
    });
    
    // Prepare submission message for agent context
    const submissionMessage = `I just completed the assessment on "${inChatAssessmentData.topic}". My answers were: ${JSON.stringify(responses, null, 2)}${score !== null ? ` I scored ${score.toFixed(0)}%.` : ''}`;
    console.log('[Assessment Submit] Submission message prepared, length:', submissionMessage.length);

    // Generate AI feedback FIRST - this saves to checkpointer automatically
    // Only save messages to Prisma AFTER successful agent invocation to maintain consistency
    // This ensures checkpointer and Prisma stay in sync
    let feedback = '';
    
    console.log('[Assessment Submit] Starting feedback generation:', {
      hasThreadId: !!threadId,
      hasConversation: !!conversation,
      agentThreadId: threadId || `assessment-feedback-${userId}-${Date.now()}`,
    });
    
    try {
      // Create a prompt that includes the submission details
      const feedbackPrompt = `The student just completed an assessment on "${inChatAssessmentData.topic}". 

Their submission:
${submissionMessage}

The correct answers were:
${JSON.stringify(inChatAssessmentData.correctAnswers || {}, null, 2)}

${score !== null ? `Their score was ${score.toFixed(0)}%.` : ''}

Please provide constructive, encouraging feedback based on their submission:
1. Acknowledge what they got right
2. Gently correct any misunderstandings
3. Provide brief explanations for incorrect answers
4. Encourage continued learning
5. Keep it concise (2-3 paragraphs max)

Be supportive and educational, not judgmental.`;

      // Use conversation's threadId for memory continuity, or generate temporary one if no conversation
      const agentThreadId = threadId || `assessment-feedback-${userId}-${Date.now()}`;
      console.log('[Assessment Submit] Invoking agent with threadId:', agentThreadId);
      
      // Invoke agent FIRST - this saves submission message and feedback to checkpointer
      const agentResponse = await invokeAgent(
        feedbackPrompt,
        agentThreadId,
        classId,
        userId,
        conversation?.id
      );
      console.log('[Assessment Submit] Agent invocation successful, response length:', agentResponse.content?.length || 0);

      feedback = agentResponse.content;
      
      // Agent invocation successful - now save messages to Prisma
      // This ensures checkpointer and Prisma are in sync
      if (conversation) {
        console.log('[Assessment Submit] Saving messages to Prisma');
        try {
          // Save submission message AFTER successful agent invocation
          const submissionMsg = await ConversationService.saveMessage({
            conversationId: conversation.id,
            role: 'USER',
            content: submissionMessage,
          });
          console.log('[Assessment Submit] Submission message saved:', submissionMsg.id);

          // Save feedback as assistant message
          const feedbackMsg = await ConversationService.saveMessage({
            conversationId: conversation.id,
            role: 'ASSISTANT',
            content: feedback,
          });
          console.log('[Assessment Submit] Feedback message saved:', feedbackMsg.id);
        } catch (saveError) {
          const saveErrorMsg = saveError instanceof Error ? saveError.message : String(saveError);
          console.error('[Assessment Submit] Error saving messages to conversation:', saveErrorMsg);
          // Don't fail the request if message save fails - checkpointer has the messages
        }
      } else {
        console.log('[Assessment Submit] No conversation, skipping Prisma message save');
      }
    } catch (error) {
      // Agent invocation failed - don't save to Prisma to maintain consistency
      // Since we save after agent invocation, no rollback needed
      // The checkpointer won't have the messages either, so they stay in sync
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('[Assessment Submit] Error generating feedback:', errorMsg);
      if (errorStack) {
        console.error('[Assessment Submit] Error stack:', errorStack);
      }
      feedback = score !== null
        ? `Thank you for completing the assessment! You scored ${score.toFixed(0)}%. Keep up the great work!`
        : 'Thank you for completing the assessment!';
      // Note: Assessment response is already saved, which is fine - it's independent data
    }

    // Update response with feedback
    console.log('[Assessment Submit] Updating assessment response with feedback');
    await prisma.inChatAssessmentResponse.update({
      where: { id: assessmentResponse.id },
      data: { feedback },
    });

    console.log('[Assessment Submit] Successfully completed:', {
      assessmentId: assessment.id,
      responseId: assessmentResponse.id,
      score,
      hasFeedback: !!feedback,
    });

    return NextResponse.json({
      success: true,
      assessmentId: assessment.id,
      responseId: assessmentResponse.id,
      score,
      feedback,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[Assessment Submit] Fatal error:', errorName, errorMsg);
    if (errorStack) {
      console.error('[Assessment Submit] Error stack:', errorStack);
    }
    console.error('[Assessment Submit] Error details:', {
      errorType: typeof error,
      errorName,
      hasMessage: error instanceof Error,
    });
    
    return NextResponse.json(
      {
        error: 'Failed to submit in-chat assessment',
        details: errorMsg,
      },
      { status: 500 }
    );
  }
}

