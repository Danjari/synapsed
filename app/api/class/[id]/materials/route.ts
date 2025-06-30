import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(req: Request, { params }: { params: { classId: string } }) {
  const { classId } = params;

  try {
    const materials = await prisma.classMaterial.findMany({
      where: { classId: new ObjectId(classId).toString() },
      orderBy: { uploadedAt: 'desc' },
    });
    console.log("here is the mat",materials)

    return NextResponse.json(materials);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
