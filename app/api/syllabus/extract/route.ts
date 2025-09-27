import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processSyllabusFromUrl } from "@/lib/syllabus/processSyllabus";
import { SyllabusCache } from "@/lib/syllabus/cache";

export async function POST(req: Request) {
  try {
    const { materialId, forceReprocess = false } = await req.json();
    
    if (!materialId) {
      return NextResponse.json({ error: "Missing materialId" }, { status: 400 });
    }

    // Get the syllabus material from database
    const material = await prisma.classMaterial.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    if (material.category !== "SYLLABUS") {
      return NextResponse.json({ error: "Material is not a syllabus" }, { status: 400 });
    }

    // Check cache first (unless force reprocess)
    if (!forceReprocess) {
      const cached = await SyllabusCache.get(materialId);
      if (cached) {
        console.log(`📋 Using cached content for ${material.title}`);
        return NextResponse.json({
          success: true,
          cached: true,
          content: cached.content,
          confidence: cached.confidence,
          processedAt: cached.processedAt,
        });
      }
    }

    // Check if reprocessing is needed
    if (!forceReprocess && !(await SyllabusCache.needsReprocessing(materialId))) {
      return NextResponse.json({
        success: true,
        message: "Syllabus already processed and up to date",
        cached: true,
      });
    }

    console.log(`🔄 Processing syllabus: ${material.title}`);

    // Process the file using optimized method
    const result = await processSyllabusFromUrl(material.url, material.title);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        processingTime: result.processingTime,
      }, { status: 500 });
    }

    // Store in cache
    const contentWithText = {
      ...result.content!,
      extractedText: "" // SyllabusContent doesn't have rawText, using empty string
    };
    await SyllabusCache.set(materialId, contentWithText, result.confidence!);

    return NextResponse.json({
      success: true,
      content: result.content,
      confidence: result.confidence,
      processingTime: result.processingTime,
      cached: false,
    });

  } catch (error) {
    console.error("Syllabus extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract syllabus content" },
      { status: 500 }
    );
  }
}

