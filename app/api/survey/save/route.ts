// /api/survey/save/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SurveySchema = z.object({
  classId: z.string(),
  questions: z.array(
    z.object({
      id: z.union([z.string(), z.number()]),
      text: z.string(),
      type: z.union([z.literal("short-answer"), z.literal("multiple-choice")]),
      options: z.array(z.string()).optional(),
    })
  ),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = SurveySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }
    const { classId, questions } = parseResult.data;

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