import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from '@google/genai';
import { getSyllabusContext, getClassInfo } from "@/lib/survey/syllabusService";
import { prisma } from "@/lib/prisma";

const geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// POST /api/surveys/generate - AI generation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { classId, context, subject, level = "undergraduate" } = body;

    if (!classId) {
      return NextResponse.json({ error: "classId is required" }, { status: 400 });
    }

    // Get class information and syllabus context
    const classInfo = await getClassInfo(classId);
    if (!classInfo) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const syllabusContext = await getSyllabusContext(classId);

    // Generate survey using AI with contextual information
    const questions = await generateContextualSurvey(
      syllabusContext,
      context,
      subject,
      level
    );

    // Create draft survey
    const survey = await prisma.survey.create({
      data: {
        classId,
        title: `${classInfo.title} - Survey`,
        questions,
        status: 'DRAFT',
      },
    });

    return NextResponse.json({
      success: true,
      survey,
      metadata: {
        courseName: syllabusContext.courseName,
        courseDescription: syllabusContext.courseDescription,
        hasSyllabus: syllabusContext.hasSyllabus,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[SURVEY_GENERATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to generate survey" },
      { status: 500 }
    );
  }
}

async function generateContextualSurvey(
  syllabusContext: {
    courseName: string;
    courseDescription: string;
    hasSyllabus: boolean;
    syllabusConfidence: number;
    materialCount: number;
    learningObjectives?: string;
    courseSchedule?: string;
  },
  userContext?: string,
  subject?: string,
  level: string = "undergraduate"
) {
  const prompt = `Generate a comprehensive student survey for personalized learning path creation.

Course Context:
- Course Name: ${syllabusContext.courseName}
- Description: ${syllabusContext.courseDescription || 'Not provided'}
- Level: ${level}
- Subject: ${subject || 'General'}
${syllabusContext.learningObjectives ? `- Learning Objectives: ${syllabusContext.learningObjectives}` : ''}
${userContext ? `- Additional Context: ${userContext}` : ''}

Generate 8-12 strategic questions that will help understand:
1. Student's prior knowledge and experience
2. Learning preferences and style
3. Goals and interests related to the course
4. Time availability and pace preferences
5. Specific areas they want to focus on
6. Challenges they anticipate

Return a diverse mix of question types:
- Multiple choice (for categorical data)
- Text (for open-ended insights)
- Rating (for preferences and confidence levels)
- Ranking (for priorities)

Each question should be clear, specific, and actionable for creating personalized learning paths.`;

  const questionSchema = {
    name: 'generate_survey_questions',
    description: 'Generate survey questions for student assessment',
    parameters: {
      type: Type.OBJECT,
      properties: {
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: 'Unique question identifier' },
              text: { type: Type.STRING, description: 'Question text' },
              type: {
                type: Type.STRING,
                enum: ['multiple_choice', 'text', 'rating', 'ranking'],
                description: 'Question type',
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Options for multiple choice or ranking questions',
              },
              required: { type: Type.BOOLEAN, description: 'Whether question is required' },
              order: { type: Type.NUMBER, description: 'Display order' },
            },
            required: ['id', 'text', 'type', 'required', 'order'],
          },
        },
      },
      required: ['questions'],
    },
  };

  const response = await geminiClient.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: {
      tools: [
        {
          functionDeclarations: [questionSchema],
        },
      ],
    },
  });

  const functionCall = response.functionCalls?.[0];
  const questions = functionCall?.args?.questions;

  if (!questions || !Array.isArray(questions)) {
    throw new Error('Failed to generate questions');
  }

  return questions;
}

