import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  params: { classId: string };
};

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { classId } = params;

    if (!classId) {
      return NextResponse.json({ error: "Missing classId" }, { status: 400 });
    }

    const survey = await prisma.survey.findUnique({
      where: { classId },
    });

    if (!survey) {
      return NextResponse.json({ questions: [] }, { status: 200 }); // fallback
    }

    return NextResponse.json(survey, { status: 200 });
  } catch (error) {
    console.error("[GET_SURVEY]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}