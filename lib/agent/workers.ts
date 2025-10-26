import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TutorStateType } from "./enhanced-state";
import { searchKnowledgeTool, assessUnderstandingTool, generateExplanationTool, createExerciseTool } from "./tools";

// Initialize the LLM for workers
const workerLlm = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  temperature: 0.7,
  maxOutputTokens: 2048,
});

/**
 * Knowledge Worker - Handles information retrieval and search
 */
export async function knowledgeWorker(state: TutorStateType): Promise<{ workerResults: Array<{
  workerType: string;
  result: string;
  confidence: number;
  metadata: Record<string, string | number | boolean | undefined>;
}> }> {
  try {
    console.log("🔍 Knowledge Worker: Searching for information");
    
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    const query = lastMessage.content;

    // Use the search knowledge tool
    const searchResult = await searchKnowledgeTool.func({
      query,
      classId: state.classId,
      lessonId: state.lessonId,
      searchType: 'concept',
      difficulty: state.studentLevel,
      limit: 5
    });

    const result = {
      workerType: "knowledge",
      result: searchResult,
      confidence: 0.9,
      metadata: {
        query: typeof query === 'string' ? query : String(query),
        classId: state.classId,
        lessonId: state.lessonId,
        timestamp: new Date().toISOString()
      }
    };

    return { workerResults: [result] };
  } catch (error) {
    console.error("Error in knowledge worker:", error);
    return { 
      workerResults: [{
        workerType: "knowledge",
        result: "Unable to retrieve knowledge at this time.",
        confidence: 0.0,
        metadata: { error: error instanceof Error ? error.message : "Unknown error" }
      }]
    };
  }
}

/**
 * Explanation Worker - Generates personalized explanations
 */
export async function explanationWorker(state: TutorStateType): Promise<{ workerResults: Array<{
  workerType: string;
  result: string;
  confidence: number;
  metadata: Record<string, string | number | boolean | undefined>;
}> }> {
  try {
    console.log("📚 Explanation Worker: Generating explanation");
    
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    const query = lastMessage.content;

    // Extract the main concept from the query
    const concept = extractConceptFromQuery(typeof query === 'string' ? query : String(query));
    
    // Use the explanation generation tool
    const explanationResult = await generateExplanationTool.func({
      concept,
      studentLevel: state.studentLevel || 'intermediate',
      context: state.currentTopic,
      explanationType: 'step-by-step'
    });

    // Enhance with LLM-generated explanation
    const enhancedExplanation = await workerLlm.invoke([
      { role: "system", content: `You are an expert tutor. Generate a clear, engaging explanation for a ${state.studentLevel || 'intermediate'} level student.` },
      { role: "user", content: `Explain: ${concept}\n\nBase explanation: ${explanationResult}\n\nStudent context: ${state.currentTopic || 'General learning'}` }
    ]);

    const result = {
      workerType: "explanation",
      result: typeof enhancedExplanation.content === 'string' ? enhancedExplanation.content : String(enhancedExplanation.content),
      confidence: 0.85,
      metadata: {
        concept,
        studentLevel: state.studentLevel,
        explanationType: 'step-by-step',
        timestamp: new Date().toISOString()
      }
    };

    return { workerResults: [result] };
  } catch (error) {
    console.error("Error in explanation worker:", error);
    return { 
      workerResults: [{
        workerType: "explanation",
        result: "Unable to generate explanation at this time.",
        confidence: 0.0,
        metadata: { error: error instanceof Error ? error.message : "Unknown error" }
      }]
    };
  }
}

/**
 * Assessment Worker - Evaluates student understanding
 */
export async function assessmentWorker(state: TutorStateType): Promise<{ workerResults: Array<{
  workerType: string;
  result: {
    assessment: {
      understanding: 'low' | 'medium' | 'high';
      gaps: string[];
      recommendations: string[];
      nextSteps: string[];
    };
    followUp: string;
    recommendations: string[];
    nextSteps: string[];
  };
  confidence: number;
  metadata: Record<string, string | number | boolean | undefined>;
}> }> {
  try {
    console.log("📊 Assessment Worker: Evaluating understanding");
    
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    const query = lastMessage.content;

    // Extract topic from context or query
    const topic = state.currentTopic || extractConceptFromQuery(typeof query === 'string' ? query : String(query));
    
    // Use the assessment tool
    const assessmentResult = await assessUnderstandingTool.func({
      topic,
      studentResponse: query,
      expectedLevel: state.studentLevel
    });

    // Parse the assessment result
    const assessment = JSON.parse(assessmentResult);

    // Generate follow-up questions or recommendations
    const followUp = await workerLlm.invoke([
      { role: "system", content: `You are an assessment expert. Based on the student's understanding level, provide helpful follow-up questions or recommendations.` },
      { role: "user", content: `Student understanding: ${assessment.understanding}\nGaps: ${assessment.gaps.join(', ')}\nRecommendations: ${assessment.recommendations.join(', ')}` }
    ]);

    const result = {
      workerType: "assessment",
      result: {
        assessment,
        followUp: typeof followUp.content === 'string' ? followUp.content : String(followUp.content),
        recommendations: assessment.recommendations,
        nextSteps: assessment.nextSteps
      },
      confidence: 0.8,
      metadata: {
        topic,
        studentLevel: state.studentLevel,
        timestamp: new Date().toISOString()
      }
    };

    return { workerResults: [result] };
  } catch (error) {
    console.error("Error in assessment worker:", error);
    return { 
      workerResults: [{
        workerType: "assessment",
        result: {
          assessment: { understanding: 'low', gaps: [], recommendations: [], nextSteps: [] },
          followUp: "Unable to assess understanding at this time.",
          recommendations: [],
          nextSteps: []
        },
        confidence: 0.0,
        metadata: { error: error instanceof Error ? error.message : "Unknown error" }
      }]
    };
  }
}

/**
 * Exercise Worker - Creates practice exercises
 */
export async function exerciseWorker(state: TutorStateType): Promise<{ workerResults: Array<{
  workerType: string;
  result: {
    exercise: {
      question: string;
      type: string;
      difficulty: string;
      instructions: string;
      sampleAnswer: string;
      hints: string[];
    };
    enhancedExercise: string;
    hints: string[];
  };
  confidence: number;
  metadata: Record<string, string | number | boolean | undefined>;
}> }> {
  try {
    console.log("📝 Exercise Worker: Creating practice exercise");
    
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    const query = lastMessage.content;

    // Extract topic from context or query
    const topic = state.currentTopic || extractConceptFromQuery(typeof query === 'string' ? query : String(query));
    
    // Use the exercise creation tool
    const exerciseResult = await createExerciseTool.func({
      topic,
      studentLevel: state.studentLevel || 'intermediate',
      exerciseType: 'short-answer',
      difficulty: 'medium'
    });

    // Parse the exercise result
    const exercise = JSON.parse(exerciseResult);

    // Enhance with additional context
    const enhancedExercise = await workerLlm.invoke([
      { role: "system", content: `You are an exercise creator. Enhance this exercise with additional context and make it more engaging.` },
      { role: "user", content: `Create an enhanced exercise for: ${topic}\nBase exercise: ${JSON.stringify(exercise)}` }
    ]);

    const result = {
      workerType: "exercise",
      result: {
        exercise,
        enhancedExercise: typeof enhancedExercise.content === 'string' ? enhancedExercise.content : String(enhancedExercise.content),
        hints: exercise.hints
      },
      confidence: 0.85,
      metadata: {
        topic,
        studentLevel: state.studentLevel,
        exerciseType: exercise.type,
        difficulty: exercise.difficulty,
        timestamp: new Date().toISOString()
      }
    };

    return { workerResults: [result] };
  } catch (error) {
    console.error("Error in exercise worker:", error);
    return { 
      workerResults: [{
        workerType: "exercise",
        result: {
          exercise: { question: "Error", type: "error", difficulty: "easy", instructions: "Error occurred", sampleAnswer: "Error", hints: [] },
          enhancedExercise: "Unable to create exercise at this time.",
          hints: []
        },
        confidence: 0.0,
        metadata: { error: error instanceof Error ? error.message : "Unknown error" }
      }]
    };
  }
}

/**
 * Progress Worker - Tracks and reports learning progress
 */
export async function progressWorker(state: TutorStateType): Promise<{ workerResults: Array<{
  workerType: string;
  result: {
    progressData: {
      topicsCovered: string[];
      currentLevel: string;
      progressPercentage: number;
      strengths: string[];
      areasForImprovement: string[];
      nextMilestones: string[];
    };
    report: string;
    recommendations: string[];
  };
  confidence: number;
  metadata: Record<string, string | number | boolean | undefined>;
}> }> {
  try {
    console.log("📈 Progress Worker: Tracking progress");
    
    // Calculate progress based on conversation history and context
    const progressData = {
      topicsCovered: state.context?.topicsCovered || [],
      currentLevel: state.studentLevel || 'intermediate',
      progressPercentage: state.progress || 0,
      strengths: [],
      areasForImprovement: [],
      nextMilestones: []
    };

    // Generate progress report
    const progressReport = await workerLlm.invoke([
      { role: "system", content: `You are a learning progress analyst. Generate a helpful progress report for the student.` },
      { role: "user", content: `Generate a progress report based on: ${JSON.stringify(progressData)}` }
    ]);

    const result = {
      workerType: "progress",
      result: {
        progressData,
        report: typeof progressReport.content === 'string' ? progressReport.content : String(progressReport.content),
        recommendations: [
          "Continue practicing with exercises",
          "Review previous topics regularly",
          "Ask questions when confused"
        ]
      },
      confidence: 0.75,
      metadata: {
        classId: state.classId,
        lessonId: state.lessonId,
        timestamp: new Date().toISOString()
      }
    };

    return { workerResults: [result] };
  } catch (error) {
    console.error("Error in progress worker:", error);
    return { 
      workerResults: [{
        workerType: "progress",
        result: {
          progressData: { topicsCovered: [], currentLevel: 'intermediate', progressPercentage: 0, strengths: [], areasForImprovement: [], nextMilestones: [] },
          report: "Unable to track progress at this time.",
          recommendations: []
        },
        confidence: 0.0,
        metadata: { error: error instanceof Error ? error.message : "Unknown error" }
      }]
    };
  }
}

/**
 * Helper function to extract the main concept from a query
 */
function extractConceptFromQuery(query: string): string {
  // Simple concept extraction - in production, this would be more sophisticated
  const words = query.toLowerCase().split(' ');
  
  // Look for common concept indicators
  const conceptIndicators = ['what is', 'explain', 'how does', 'tell me about', 'define'];
  
  for (const indicator of conceptIndicators) {
    if (query.toLowerCase().includes(indicator)) {
      const index = query.toLowerCase().indexOf(indicator);
      const afterIndicator = query.substring(index + indicator.length).trim();
      return afterIndicator.split(' ').slice(0, 3).join(' '); // Take first 3 words after indicator
    }
  }
  
  // Fallback: return first few words
  return words.slice(0, 3).join(' ');
}
