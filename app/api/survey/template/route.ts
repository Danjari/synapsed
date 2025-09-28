import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSyllabusContext, getClassInfo, SyllabusContext } from "@/lib/survey/syllabusService";

const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { classId, subject, level = "undergraduate" } = body;

    if (!classId) {
      return NextResponse.json({ error: "classId is required" }, { status: 400 });
    }

    // Get class information and syllabus context
    const classInfo = await getClassInfo(classId);
    if (!classInfo) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const syllabusContext = await getSyllabusContext(classId);

    // Generate survey template using AI with contextual information
    const templateQuestions = await generateContextualSurveyTemplate(syllabusContext, subject, level);
    
    return NextResponse.json({ 
      success: true, 
      questions: templateQuestions,
      metadata: {
        courseName: syllabusContext.courseName,
        courseDescription: syllabusContext.courseDescription,
        hasSyllabus: syllabusContext.hasSyllabus,
        syllabusConfidence: syllabusContext.syllabusConfidence,
        materialCount: syllabusContext.materialCount,
        subject,
        level,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("[SURVEY_TEMPLATE_ERROR]", error);
    return NextResponse.json({ error: "Failed to generate survey template" }, { status: 500 });
  }
}

async function generateContextualSurveyTemplate(syllabusContext: SyllabusContext, subject?: string, level: string = "undergraduate") {
  const model = geminiClient.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are an expert educational assessment specialist. Generate a comprehensive student survey template based on the following course information:

COURSE DETAILS:
- Course Name: ${syllabusContext.courseName}
- Description: ${syllabusContext.courseDescription}
- Academic Level: ${level}
- Subject Area: ${subject || 'Not specified'}

SYLLABUS INFORMATION:
- Prerequisites: ${syllabusContext.prerequisites}
- Learning Objectives: ${syllabusContext.learningObjectives}
- Assessment Methods: ${syllabusContext.assessmentMethods}
- Course Schedule: ${syllabusContext.courseSchedule}
- Grading Policy: ${syllabusContext.gradingPolicy}

SYLLABUS DATA QUALITY:
- Has Syllabus Data: ${syllabusContext.hasSyllabus}
- Processing Confidence: ${syllabusContext.syllabusConfidence}%
- Material Count: ${syllabusContext.materialCount}

Create 12-15 survey questions that are specifically tailored to this course. Focus on:

1. PREREQUISITE ASSESSMENT (3-4 questions):
   - Based on the actual prerequisites: ${syllabusContext.prerequisites}
   - Assess specific knowledge areas mentioned in prerequisites
   - Evaluate confidence in prerequisite skills
   - Identify knowledge gaps in required background

2. LEARNING OBJECTIVES READINESS (3-4 questions):
   - Based on the course learning objectives: ${syllabusContext.learningObjectives}
   - Assess readiness for specific learning outcomes
   - Evaluate prior experience with course topics
   - Understand student expectations for course content

3. ASSESSMENT PREPARATION (2-3 questions):
   - Based on assessment methods: ${syllabusContext.assessmentMethods}
   - Understand student preferences for evaluation methods
   - Assess comfort with different assessment types
   - Evaluate study and preparation strategies

4. COURSE-SPECIFIC GOALS (3-4 questions):
   - Based on course description: ${syllabusContext.courseDescription}
   - Understand student goals aligned with course content
   - Assess motivation for taking this specific course
   - Evaluate career/academic goals related to course topics

5. BLOOM'S TAXONOMY ASSESSMENT (2-3 questions):
   - REMEMBER: Recall of prerequisite concepts
   - UNDERSTAND: Comprehension of course-related topics
   - APPLY: Application of knowledge to course scenarios
   - ANALYZE: Analytical thinking about course content
   - EVALUATE: Critical evaluation of course-related concepts
   - CREATE: Creative thinking about course applications

IMPORTANT REQUIREMENTS:
- Make questions SPECIFIC to this course's actual content and prerequisites
- Reference actual prerequisite topics when available
- Align with actual learning objectives when available
- Use the course description to inform goal-related questions
- If syllabus data is limited, create more general but relevant questions
- Mix of short-answer and multiple-choice questions
- Use clear, student-friendly language
- Include appropriate multiple-choice options where relevant
- Ensure questions are actionable for creating personalized learning paths

Return ONLY a valid JSON array in this exact format:
[
  {
    "id": "unique_id_1",
    "text": "Question text here",
    "type": "short-answer",
    "options": []
  },
  {
    "id": "unique_id_2", 
    "text": "Question text here",
    "type": "multiple-choice",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"]
  }
]

Generate questions that will help create personalized learning experiences for students.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean the response to remove any markdown formatting
    let cleanResponse = text.trim();
    
    // Remove markdown code blocks if present
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Parse and validate JSON
    const questions = JSON.parse(cleanResponse);
    
    // Validate the structure
    if (!Array.isArray(questions)) {
      throw new Error("Response is not an array");
    }

    // Ensure each question has required fields
    const validatedQuestions = questions.map((q: { id?: string; text?: string; type?: string; options?: string[] }, index: number) => ({
      id: q.id || `template_${Date.now()}_${index}`,
      text: q.text || "",
      type: q.type === "multiple-choice" ? "multiple-choice" : "short-answer",
      options: q.type === "multiple-choice" ? (q.options || []) : []
    }));

    return validatedQuestions;
  } catch (error) {
    console.error("AI generation error:", error);
    
    // Fallback template if AI fails
    return generateFallbackTemplate(syllabusContext, subject);
  }
}

function generateFallbackTemplate(syllabusContext: SyllabusContext, subject?: string) {
  const courseName = syllabusContext.courseName;
  const hasPrerequisites = syllabusContext.prerequisites && syllabusContext.prerequisites !== "No prerequisites specified";
  const hasLearningObjectives = syllabusContext.learningObjectives && syllabusContext.learningObjectives !== "No learning objectives specified";
  
  return [
    {
      id: "goals_1",
      text: `What are your primary learning goals for ${courseName}?`,
      type: "short-answer",
      options: []
    },
    {
      id: "goals_2", 
      text: "What motivated you to enroll in this course?",
      type: "multiple-choice",
      options: [
        "Required for my major",
        "Personal interest in the subject",
        "Career advancement",
        "Prerequisite for other courses",
        "Other"
      ]
    },
    {
      id: "prereq_1",
      text: hasPrerequisites 
        ? `Rate your current understanding of the prerequisites for ${courseName}: ${syllabusContext.prerequisites.substring(0, 100)}...`
        : `Rate your current understanding of prerequisite topics for ${courseName}`,
      type: "multiple-choice", 
      options: [
        "Very confident",
        "Somewhat confident", 
        "Neutral",
        "Somewhat uncertain",
        "Very uncertain"
      ]
    },
    {
      id: "learning_1",
      text: "What is your preferred learning style?",
      type: "multiple-choice",
      options: [
        "Visual (diagrams, charts, videos)",
        "Auditory (lectures, discussions)",
        "Reading/Writing (texts, notes)",
        "Kinesthetic (hands-on activities)",
        "Mixed approach"
      ]
    },
    {
      id: "bloom_remember",
      text: `List 3 key concepts you remember from previous ${subject || 'related'} courses`,
      type: "short-answer",
      options: []
    },
    {
      id: "bloom_understand", 
      text: hasLearningObjectives 
        ? `Based on the course learning objectives, what do you expect to learn in ${courseName}?`
        : "Explain in your own words what you expect to learn in this course",
      type: "short-answer",
      options: []
    },
    {
      id: "bloom_apply",
      text: "How do you plan to apply what you learn in this course?",
      type: "short-answer", 
      options: []
    },
    {
      id: "bloom_analyze",
      text: "What challenges do you anticipate in this course?",
      type: "short-answer",
      options: []
    },
    {
      id: "bloom_evaluate",
      text: "How do you prefer to receive feedback on your work?",
      type: "multiple-choice",
      options: [
        "Written comments",
        "Verbal feedback",
        "Peer review",
        "Self-assessment",
        "Combination of methods"
      ]
    },
    {
      id: "bloom_create",
      text: "What kind of projects or assignments would you find most engaging?",
      type: "short-answer",
      options: []
    }
  ];
}
