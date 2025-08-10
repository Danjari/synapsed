export const config = {
  api: {
    bodyParser: {
      sizeLimit: "25mb",
    },
  },
};
import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2/uploadtoR2";
import { prisma } from "@/lib/prisma";
import { vectorizeAndUpdate } from "@/lib/vectorization";


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
    const fileUrl = await uploadToR2(buffer, file.name, file.type, classId);

    const extension = file.name.split(".").pop()?.toLowerCase();
    const type =
      extension === "pdf" ? "PDF" :
      extension === "docx" ? "DOCX" :
      extension === "mp4" ? "MP4" :
      undefined;

    if (!type) continue; // Skip files with unsupported types

    const mimeType =
      extension === "pdf"
        ? "application/pdf"
        : extension === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : extension === "mp4"
        ? "video/mp4"
        : "application/octet-stream"; // fallback

      if (!type || !mimeType) {
        console.error(`❌ Skipping file "${file.name}" due to unsupported extension or missing MIME type`);
        continue; // Skip unsupported files
      }
    const material = await prisma.classMaterial.create({
      data: {
        classId,
        title: file.name,
        url: fileUrl,
        type: type,
        mimeType:mimeType,
        uploadedAt: new Date(),
        isVectorized: false,
        vectorNamespace: `class_${classId}`,
      },
    });

    results.push(material);

    await vectorizeAndUpdate({
      ...material,
      vectorNamespace: material.vectorNamespace ?? "",
      mimeType: material.mimeType ?? ""
    });
  }

  return NextResponse.json({ success: true, materials: results });
}
