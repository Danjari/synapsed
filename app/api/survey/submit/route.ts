import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { studentId, classId, answers } = await req.json();

    if (!studentId || !classId || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.studentSurveyResponse.findFirst({
      where: { studentId, classId },
    });

    if (existing) {
      // Update the existing response
      await prisma.studentSurveyResponse.update({
        where: { id: existing.id },
        data: {
          answers,
          submittedAt: new Date(),
        },
      });
    } else {
      // Create new survey response
      await prisma.studentSurveyResponse.create({
        data: {
          studentId,
          classId,
          answers,
          submittedAt: new Date(),
        },
      });
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