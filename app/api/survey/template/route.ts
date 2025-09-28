import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { classId, courseName, subject, level = "undergraduate" } = body;

    if (!classId || !courseName) {
      return NextResponse.json({ error: "classId and courseName are required" }, { status: 400 });
    }

    // Generate survey template using AI
    const templateQuestions = await generateSurveyTemplate(courseName, subject, level);
    
    return NextResponse.json({ 
      success: true, 
      questions: templateQuestions,
      metadata: {
        courseName,
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

async function generateSurveyTemplate(courseName: string, subject?: string, level: string = "undergraduate") {
  const model = geminiClient.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are an expert educational assessment specialist. Generate a comprehensive student survey template for the course "${courseName}"${subject ? ` in ${subject}` : ''} at the ${level} level.

Create 12-15 survey questions that cover:

1. STUDENT GOALS & MOTIVATION (3-4 questions):
   - Learning objectives and career goals
   - Motivation for taking the course
   - Expected outcomes and applications

2. PREREQUISITE KNOWLEDGE ASSESSMENT (2-3 questions):
   - Previous experience with related topics
   - Confidence levels in prerequisite skills
   - Specific knowledge gaps or strengths

3. LEARNING STYLE & PREFERENCES (2-3 questions):
   - Preferred learning methods
   - Study habits and time management
   - Technology comfort level

4. BLOOM'S TAXONOMY ASSESSMENT (6-8 questions):
   - REMEMBER: Recall of basic facts and concepts
   - UNDERSTAND: Comprehension and explanation abilities
   - APPLY: Application of knowledge to new situations
   - ANALYZE: Breaking down complex information
   - EVALUATE: Making judgments and critiques
   - CREATE: Generating new ideas or solutions

Requirements:
- Mix of short-answer and multiple-choice questions
- Questions should be specific to the course content
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
    const validatedQuestions = questions.map((q: any, index: number) => ({
      id: q.id || `template_${Date.now()}_${index}`,
      text: q.text || "",
      type: q.type === "multiple-choice" ? "multiple-choice" : "short-answer",
      options: q.type === "multiple-choice" ? (q.options || []) : []
    }));

    return validatedQuestions;
  } catch (error) {
    console.error("AI generation error:", error);
    
    // Fallback template if AI fails
    return generateFallbackTemplate(courseName, subject);
  }
}

function generateFallbackTemplate(courseName: string, subject?: string) {
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
      text: `Rate your current understanding of prerequisite topics for ${courseName}`,
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
      text: "Explain in your own words what you expect to learn in this course",
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
