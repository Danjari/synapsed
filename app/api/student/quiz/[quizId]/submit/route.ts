import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// POST: Submit quiz answers
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quizId } = await params;
    const body = await request.json();
    const { studentId, classId, answers } = body;

    if (!studentId || !classId || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify quiz exists and is published
    const quiz = await prisma.professorQuiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (quiz.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Quiz is not available' }, { status: 403 });
    }

    // Verify student is enrolled
    const enrollment = await prisma.classEnrollment.findFirst({
      where: {
        classId,
        studentId,
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Not enrolled in this class' }, { status: 403 });
    }

    // Check if already submitted
    const existingResponse = await prisma.professorQuizResponse.findFirst({
      where: {
        quizId,
        studentId,
        submittedAt: { not: null },
      },
    });

    if (existingResponse) {
      return NextResponse.json({ error: 'Quiz already submitted' }, { status: 400 });
    }

    // Calculate score
    let correctCount = 0;
    let totalQuestions = quiz.questions.length;

    const quizAnswers = answers.map((ans: { questionId: string; answerText: string }) => {
      const question = quiz.questions.find(q => q.id === ans.questionId);
      if (!question) return null;

      let isCorrect = false;
      
      if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
        const selectedOption = question.options.find(opt => opt.text === ans.answerText);
        isCorrect = selectedOption?.isCorrect || false;
        if (isCorrect) correctCount++;
      } else if (question.type === 'SHORT_ANSWER') {
        // Short answers are not auto-graded, marked as null
        isCorrect = false; // Will be manually graded
      }

      return {
        responseId: '', // Will be set after creating response
        questionId: ans.questionId,
        questionText: question.text,
        answerText: ans.answerText,
        selectedOptionIds: question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE'
          ? [question.options.find(opt => opt.text === ans.answerText)?.id || '']
          : [],
        isCorrect,
      };
    }).filter(Boolean);

    const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

    // Create response and answers
    const response = await prisma.professorQuizResponse.create({
      data: {
        quizId,
        studentId,
        score,
        submittedAt: new Date(),
        answers: {
          create: quizAnswers.map((ans: any) => ({
            questionId: ans.questionId,
            questionText: ans.questionText,
            answerText: ans.answerText,
            selectedOptionIds: ans.selectedOptionIds,
            isCorrect: ans.isCorrect,
          })),
        },
      },
    });

    return NextResponse.json({
      success: true,
      responseId: response.id,
      score,
      totalQuestions,
      correctCount,
    }, { status: 200 });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    return NextResponse.json(
      { error: 'Failed to submit quiz' },
      { status: 500 }
    );
  }
}

