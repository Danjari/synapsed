import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { studentId, classId, answers } = await req.json();

    if (!studentId || !classId || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Ensure answers is properly formatted for JSON storage
    const formattedAnswers = answers.map((answer: { questionId?: string; question_id?: string; answer?: string; value?: string; text?: string }) => ({
      questionId: answer.questionId || answer.question_id,
      answer: answer.answer || answer.value || answer.text
    }));

    const existing = await prisma.studentSurveyResponse.findFirst({
      where: { studentId, classId },
    });

    if (existing) {
      // Update the existing response
      await prisma.studentSurveyResponse.update({
        where: { id: existing.id },
        data: {
          answers: formattedAnswers,
          submittedAt: new Date(),
        },
      });
    } else {
      // Create new survey response
      const createData = {
        studentId,
        classId,
        answers: formattedAnswers,
        submittedAt: new Date(),
      };
      
      try {
        await prisma.studentSurveyResponse.create({
          data: createData,
        });
      } catch (createError: unknown) {
        if (createError && typeof createError === 'object' && 'code' in createError && createError.code === 'P2002') {
          // Unique constraint error - try to update instead
          const existingResponse = await prisma.studentSurveyResponse.findFirst({
            where: { studentId, classId },
          });
          
          if (existingResponse) {
            await prisma.studentSurveyResponse.update({
              where: { id: existingResponse.id },
              data: {
                answers: formattedAnswers,
                submittedAt: new Date(),
              },
            });
          } else {
            // Delete and recreate as fallback
            await prisma.studentSurveyResponse.deleteMany({
              where: { studentId, classId }
            });
            await prisma.studentSurveyResponse.create({
              data: {
                studentId,
                classId,
                answers: formattedAnswers,
                submittedAt: new Date(),
              },
            });
          }
        } else {
          throw createError;
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SURVEY_SUBMIT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}



// ✅ Handle GET for checking if student submitted
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const classId = searchParams.get("classId");
  
    if (!studentId || !classId) {
      return NextResponse.json({ error: "Missing studentId or classId" }, { status: 400 });
    }
  
    const existing = await prisma.studentSurveyResponse.findFirst({
      where: { studentId, classId },
    });
  
    return NextResponse.json({ submitted: !!existing });
  }