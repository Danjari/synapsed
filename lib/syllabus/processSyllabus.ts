import { Mistral } from '@mistralai/mistralai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const mistralClient = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });
const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface SyllabusContent {
  learningObjectives: string;
  courseSchedule: string;
  assessmentMethods: string;
  prerequisites: string;
  courseDescription: string;
  instructorInfo: string;
  gradingPolicy: string;
}

export interface ProcessingResult {
  success: boolean;
  content?: SyllabusContent;
  error?: string;
  processingTime?: number;
  confidence?: number;
}

/**
 * Process syllabus directly from R2 URL without downloading
 */
export async function processSyllabusFromUrl(
  fileUrl: string, 
  fileName: string,
  retryCount: number = 3
): Promise<ProcessingResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🔄 Processing syllabus: ${fileName}`);
    
    // Step 1: Direct OCR processing from R2 URL
    const ocrResult = await processWithRetry(
      () => mistralClient.ocr.process({
        model: 'mistral-ocr-latest',
        document: {
          type: 'document_url',
          documentUrl: fileUrl,
        },
      }),
      retryCount
    );

    if (!ocrResult.pages || ocrResult.pages.length === 0) {
      throw new Error('No content extracted from document');
    }

    // Step 2: Combine all pages into single text
    const fullText = ocrResult.pages
      .map((page, index) => `--- Page ${(page.index ?? index) + 1} ---\n${page.markdown}`)
      .join('\n\n');

    console.log(`📄 Extracted ${ocrResult.pages.length} pages, ${fullText.length} characters`);

    // Step 3: AI-powered content parsing
    const parsedContent = await parseSyllabusWithAI(fullText);
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Syllabus processed in ${processingTime}ms`);

    return {
      success: true,
      content: parsedContent,
      processingTime,
      confidence: calculateConfidence(parsedContent),
    };

  } catch (error) {
    console.error(`❌ Syllabus processing failed for ${fileName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    };
  }
}

/**
 * AI-powered syllabus content parsing using Gemini
 */
async function parseSyllabusWithAI(text: string): Promise<SyllabusContent> {
  const prompt = `
Analyze this course syllabus and extract the following information in JSON format:

{
  "learningObjectives": "List of course learning objectives/outcomes (CLOs)",
  "courseSchedule": "Course schedule with topics, dates, and readings",
  "assessmentMethods": "Grading methods, assignments, exams, etc.",
  "prerequisites": "Required prerequisites or recommended background",
  "courseDescription": "Course description and overview",
  "instructorInfo": "Instructor contact information and office hours",
  "gradingPolicy": "Grading scale, policies, and procedures"
}

Instructions:
- Extract information accurately from the text
- If a section is not found, use "Not specified"
- For course schedule, include dates, topics, and readings if available
- For learning objectives, list each objective clearly
- Be concise but comprehensive
- Return only valid JSON, no additional text

Syllabus text:
${text.substring(0, 8000)} // Limit to avoid token limits
`;

  try {
    const model = geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    const requiredFields = ['learningObjectives', 'courseSchedule', 'assessmentMethods'];
    for (const field of requiredFields) {
      if (!parsed[field] || parsed[field] === 'Not specified') {
        console.warn(`⚠️ Missing or empty field: ${field}`);
      }
    }
    
    return parsed as SyllabusContent;
    
  } catch (error) {
    console.error('AI parsing failed, falling back to simple parsing:', error);
    return fallbackParsing(text);
  }
}

/**
 * Fallback parsing method using simple text analysis
 */
function fallbackParsing(text: string): SyllabusContent {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let learningObjectives = "";
  let courseSchedule = "";
  let assessmentMethods = "";
  let prerequisites = "";
  let courseDescription = "";
  let instructorInfo = "";
  const gradingPolicy = "";
  
  let currentSection = "";
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    // Detect section headers
    if (line.includes('learning objectives') || line.includes('course outcomes')) {
      currentSection = 'objectives';
      continue;
    }
    if (line.includes('course schedule') || line.includes('tentative breakdown')) {
      currentSection = 'schedule';
      continue;
    }
    if (line.includes('assessment') || line.includes('grading') || line.includes('assignments')) {
      currentSection = 'assessment';
      continue;
    }
    if (line.includes('prerequisites') || line.includes('required background')) {
      currentSection = 'prerequisites';
      continue;
    }
    if (line.includes('course description') || line.includes('overview')) {
      currentSection = 'description';
      continue;
    }
    if (line.includes('instructor') || line.includes('professor') || line.includes('contact')) {
      currentSection = 'instructor';
      continue;
    }
    
    // Add content to appropriate section
    if (currentSection === 'objectives' && lines[i].length > 10) {
      learningObjectives += lines[i] + '\n';
    }
    if (currentSection === 'schedule' && lines[i].length > 5) {
      courseSchedule += lines[i] + '\n';
    }
    if (currentSection === 'assessment' && lines[i].length > 5) {
      assessmentMethods += lines[i] + '\n';
    }
    if (currentSection === 'prerequisites' && lines[i].length > 5) {
      prerequisites += lines[i] + '\n';
    }
    if (currentSection === 'description' && lines[i].length > 10) {
      courseDescription += lines[i] + '\n';
    }
    if (currentSection === 'instructor' && lines[i].length > 5) {
      instructorInfo += lines[i] + '\n';
    }
  }
  
  return {
    learningObjectives: learningObjectives.trim() || 'Not specified',
    courseSchedule: courseSchedule.trim() || 'Not specified',
    assessmentMethods: assessmentMethods.trim() || 'Not specified',
    prerequisites: prerequisites.trim() || 'Not specified',
    courseDescription: courseDescription.trim() || 'Not specified',
    instructorInfo: instructorInfo.trim() || 'Not specified',
    gradingPolicy: gradingPolicy.trim() || 'Not specified',
  };
}

/**
 * Retry logic for API calls
 */
async function processWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed:`, error);
      
      if (attempt < maxRetries) {
        const waitTime = delay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⏳ Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Calculate confidence score based on content quality
 */
function calculateConfidence(content: SyllabusContent): number {
  let score = 0;
  const maxScore = 7;
  
  // Check if each field has meaningful content
  const fields = Object.values(content);
  for (const field of fields) {
    if (field && field !== 'Not specified' && field.length > 20) {
      score++;
    }
  }
  
  return Math.round((score / maxScore) * 100);
}
