import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type SurveyAnswer = { questionId: string; answer: string };
type SurveyQuestion = { id: string; text: string; [key: string]: unknown };

export async function GET(_: NextRequest, { params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;

  try {
    const responses = await prisma.studentSurveyResponse.findMany({
      where: { classId },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const survey = await prisma.survey.findUnique({
      where: { classId },
    });

    return NextResponse.json(
      responses.map((res) => ({
        studentId: res.studentId,
        name: res.student.name || res.student.email,
        submittedAt: res.submittedAt,
        answers: Array.isArray(res.answers)
          ? (res.answers as SurveyAnswer[]).map((ans) => {
              const question = Array.isArray(survey?.questions)
                ? (survey.questions as SurveyQuestion[]).find((q) => q.questionId == ans.questionId || q.id == ans.questionId)
                : undefined;
              return {
                question: question?.text || "Unknown question",
                answer: ans.answer,
              };
            })
          : [],
      }))
    );
  } catch (error) {
    console.error("[GET_SURVEY_RESPONSES]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}