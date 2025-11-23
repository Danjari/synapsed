import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invokeAgent } from '@/lib/agent/simple-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
      return NextResponse.json(
        { error: 'Missing required fields: inChatAssessmentData, responses, or userId' },
        { status: 400 }
      );
    }

    // Create or find in-chat assessment record
    let assessment;
    if (assessmentId) {
      assessment = await prisma.inChatAssessment.findUnique({
        where: { id: assessmentId },
      });
    }

    if (!assessment) {
      // Create new in-chat assessment record
      assessment = await prisma.inChatAssessment.create({
        data: {
          topic: inChatAssessmentData.topic,
          nodeTitle: inChatAssessmentData.nodeTitle || null,
          fields: inChatAssessmentData.fields,
          schema: inChatAssessmentData.schema,
          correctAnswers: inChatAssessmentData.correctAnswers || {},
          conversationId: conversationId || null,
          nodeId: lessonId || null,
        },
      });
    }

    // Calculate score if correct answers are provided
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

    // Save in-chat assessment response
    const assessmentResponse = await prisma.inChatAssessmentResponse.create({
      data: {
        assessmentId: assessment.id,
        studentId: userId,
        responses,
        score,
      },
    });

    // Generate AI feedback
    let feedback = '';
    try {
      const feedbackPrompt = `A student just completed an in-chat assessment on "${inChatAssessmentData.topic}". 

Their answers were:
${JSON.stringify(responses, null, 2)}

The correct answers were:
${JSON.stringify(inChatAssessmentData.correctAnswers || {}, null, 2)}

${score !== null ? `Their score was ${score.toFixed(0)}%.` : ''}

Please provide constructive, encouraging feedback:
1. Acknowledge what they got right
2. Gently correct any misunderstandings
3. Provide brief explanations for incorrect answers
4. Encourage continued learning
5. Keep it concise (2-3 paragraphs max)

Be supportive and educational, not judgmental.`;

      const agentResponse = await invokeAgent(
        feedbackPrompt,
        undefined, // threadId - could use conversation threadId if available
        classId,
        userId
      );

      feedback = agentResponse.content;
    } catch (error) {
      console.error('Error generating feedback:', error);
      feedback = score !== null
        ? `Thank you for completing the assessment! You scored ${score.toFixed(0)}%. Keep up the great work!`
        : 'Thank you for completing the assessment!';
    }

    // Update response with feedback
    await prisma.inChatAssessmentResponse.update({
      where: { id: assessmentResponse.id },
      data: { feedback },
    });

    return NextResponse.json({
      success: true,
      assessmentId: assessment.id,
      responseId: assessmentResponse.id,
      score,
      feedback,
    });
  } catch (error) {
    console.error('Error submitting in-chat assessment:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit in-chat assessment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

