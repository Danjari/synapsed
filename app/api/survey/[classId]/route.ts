// /app/api/survey/[classId]/route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: { classId: string } }
) {
  try {
    const { params } = context;
    const classId = await params.classId;

    if (!classId) {
      return NextResponse.json({ error: "Missing classId" }, { status: 400 });
    }

    const survey = await prisma.survey.findUnique({
      where: { classId },
    });

    if (!survey) {
      return NextResponse.json({ questions: [] }, { status: 200 });
    }

    return NextResponse.json(survey);
  } catch (error) {
    console.error("[GET_SURVEY]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}