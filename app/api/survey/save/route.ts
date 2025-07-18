// /api/survey/save/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { classId, questions } = body;

    if (!classId || !questions) {
      return NextResponse.json({ success: false, error: "Missing classId or questions" }, { status: 400 });
    }

    const survey = await prisma.survey.upsert({
      where: { classId },
      update: { questions },
      create: { classId, questions },
    });

    return NextResponse.json({ success: true, survey });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}