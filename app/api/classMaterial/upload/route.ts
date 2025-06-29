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
import { uploadToMistral } from "@/lib/ocr/uploadToMistral";
import { getOcrMarkdown } from "@/lib/ocr/getOcrMardown";
import { chunkMarkdownByPage } from "@/lib/chunking/chunkMarkdown";
import { embedAndStore } from "@/lib/pinecone/embedAndStore";

type Material = {
  id: string;
  url: string;
  title: string;
  type: string;
  classId: string;
  vectorNamespace: string;
};

export async function vectorizeAndUpdate(material: Material) {
  try {
    // Download file
    const res = await fetch(material.url);
    const blob = await res.blob();
    const file = new File([blob], material.title, { type: material.type });

    // OCR & markdown
    const ocrRes = await uploadToMistral(file);
    const markdown = await getOcrMarkdown(ocrRes.id);

    // Chunk
    const chunks = await chunkMarkdownByPage(markdown);

    // Embed & store
    await embedAndStore(chunks, {
      namespace: material.vectorNamespace,
      metadata: {
        classId: material.classId,
        materialId: material.id,
        title: material.title,
      },
    });

    // Update Mongo
    await prisma.classMaterial.update({
      where: { id: material.id },
      data: {
        isVectorized: true,
      },
    });

    console.log(`✅ Vectorization complete for ${material.title}`);
  } catch (err) {
    console.error(`❌ Vectorization failed for ${material.title}:`, err);
  }
}


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
    const type = extension === "pdf" ? "PDF" : extension === "docx" ? "DOCX" : "MP4";

    const material = await prisma.classMaterial.create({
      data: {
        classId,
        title: file.name,
        url: fileUrl,
        type,
        uploadedAt: new Date(),
        isVectorized: false,
        vectorNamespace: `class_${classId}`,
      },
    });

    results.push(material);

    await vectorizeAndUpdate(material);
  }

  return NextResponse.json({ success: true, materials: results });
}
