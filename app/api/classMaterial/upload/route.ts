import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2/uploadToR2";
import { prisma } from "@/lib/prisma";

function bufferFromFile(file: File): Promise<Buffer> {
  return new Response(file.stream()).arrayBuffer().then(buf => Buffer.from(buf));
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const classId = formData.get("classId") as string;
  const files = formData.getAll("files") as File[];

  if (!classId || files.length === 0) {
    return NextResponse.json({ error: "Missing classId or files" }, { status: 400 });
  }

  const results = [];

  for (const file of files) {
    const buffer = await bufferFromFile(file);
    const fileUrl = await uploadToR2(buffer, file.name, file.type);

    const extension = file.name.split(".").pop()?.toLowerCase();
    const type = extension === "pdf" ? "PDF" : extension === "docx" ? "DOCX" : "MP4";

    const material = await prisma.classMaterial.create({
      data: {
        classId,
        title: file.name,
        url: fileUrl,
        type,
        isVectorized: false,
        vectorNamespace: classId,
      },
    });

    results.push(material);
  }

  return NextResponse.json({ success: true, materials: results });
}
