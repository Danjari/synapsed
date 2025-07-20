import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { classId: string; studentId: string } }
) {
  const { classId, studentId } = params;
  if (!classId || !studentId) {
    return NextResponse.json({ exists: false });
  }
  const pathway = await prisma.learningPathway.findFirst({
    where: { classId, studentId }
  });
  return NextResponse.json({ exists: !!pathway });
}
