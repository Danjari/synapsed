import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { classId } = await req.json();
  if (!classId) return NextResponse.json({ error: "Missing classId" }, { status: 400 });

  // Get all student survey responses for this class
  const responses = await prisma.studentSurveyResponse.findMany({ where: { classId } });
  const survey = await prisma.survey.findUnique({ where: { classId } });
  const questions = Array.isArray(survey?.questions) ? survey.questions : [];

  for (const response of responses) {
    // Build prompt from answers and questions
    const prompt = response.answers!.map((ans: any) => {
      const q = questions.find((q: any) => q.id == ans.questionId);
      return `Q: ${q?.text || "Unknown"}\nA: ${ans.answer}`;
    }).join("\n");

    // Call your existing pathway generation endpoint (or refactor logic into a function)
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pathway/generate?studentId=${response.studentId}&classId=${classId}&prompt=${encodeURIComponent(prompt)}`);
  }

  return NextResponse.json({ success: true });
}