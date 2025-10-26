import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Send } from "@langchain/langgraph";
import { TutorStateType } from "./enhanced-state";
import { routeQuery, getWorkersForRoute } from "./routing";
import { 
  knowledgeWorker, 
  explanationWorker, 
  assessmentWorker, 
  exerciseWorker, 
  progressWorker 
} from "./workers";

// Initialize the LLM for orchestration
const orchestratorLlm = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  temperature: 0.5,
  maxOutputTokens: 1024,
});

/**
 * Main orchestrator function that routes queries and creates workers
 */
export async function orchestrator(state: TutorStateType): Promise<Send[]> {
  try {
    console.log("🎯 Orchestrator: Analyzing query and creating workers");
    
    // Route the query to determine the best approach
    const route = await routeQuery(state);
    console.log("📍 Route determined:", route);
    
    // Get the workers needed for this route
    const workerTypes = getWorkersForRoute(route);
    console.log("👥 Workers needed:", workerTypes);
    
    // Create Send objects for each worker
    const workers: Send[] = [];
    
    for (const workerType of workerTypes) {
      switch (workerType) {
        case 'knowledgeWorker':
          workers.push(new Send('knowledgeWorker', { 
            query: state.messages[state.messages.length - 1].content,
            classId: state.classId,
            lessonId: state.lessonId,
            studentLevel: state.studentLevel
          }));
          break;
          
        case 'explanationWorker':
          workers.push(new Send('explanationWorker', { 
            query: state.messages[state.messages.length - 1].content,
            studentLevel: state.studentLevel,
            currentTopic: state.currentTopic
          }));
          break;
          
        case 'assessmentWorker':
          workers.push(new Send('assessmentWorker', { 
            query: state.messages[state.messages.length - 1].content,
            topic: state.currentTopic,
            studentLevel: state.studentLevel
          }));
          break;
          
        case 'exerciseWorker':
          workers.push(new Send('exerciseWorker', { 
            query: state.messages[state.messages.length - 1].content,
            topic: state.currentTopic,
            studentLevel: state.studentLevel
          }));
          break;
          
        case 'progressWorker':
          workers.push(new Send('progressWorker', { 
            classId: state.classId,
            lessonId: state.lessonId,
            studentLevel: state.studentLevel,
            progress: state.progress
          }));
          break;
      }
    }
    
    // Update state with orchestration information
    state.lastAction = `orchestrated_${route}`;
    state.context = {
      ...state.context,
      route,
      workerTypes,
      orchestrationTimestamp: new Date().toISOString(),
    };
    
    console.log("✅ Orchestrator: Created", workers.length, "workers");
    return workers;
  } catch (error) {
    console.error("Error in orchestrator:", error);
    // Fallback to explanation worker
    return [new Send('explanationWorker', { 
      query: state.messages[state.messages.length - 1].content,
      studentLevel: state.studentLevel || 'intermediate'
    })];
  }
}

/**
 * Response synthesizer that combines results from multiple workers
 */
export async function synthesizer(state: TutorStateType): Promise<{ finalResponse: string }> {
  try {
    console.log("🔄 Synthesizer: Combining worker results");
    
    const workerResults = state.workerResults;
    
    if (!workerResults || workerResults.length === 0) {
      return { finalResponse: "I apologize, but I wasn't able to process your request properly. Please try again." };
    }
    
    // If only one worker, return its result directly
    if (workerResults.length === 1) {
      const result = workerResults[0];
      return { finalResponse: result.result };
    }
    
    // Combine multiple worker results
    const synthesisPrompt = `You are an expert educational AI tutor. Combine the following responses from different specialized workers into a coherent, helpful, and engaging response for the student.

Student Context:
- Class: ${state.classId || 'Not specified'}
- Lesson: ${state.lessonId || 'Not specified'}
- Student Level: ${state.studentLevel || 'intermediate'}
- Current Topic: ${state.currentTopic || 'Not specified'}

Worker Results:
${workerResults.map((result, index) => `
Worker ${index + 1} (${result.workerType}):
${typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2)}
`).join('\n')}

Instructions:
1. Create a unified, coherent response that addresses the student's needs
2. Use the most relevant information from each worker
3. Maintain a warm, encouraging, and educational tone
4. Structure the response logically (introduction, main content, conclusion)
5. Include specific examples or details when available
6. End with a helpful question or next step suggestion

Generate a comprehensive response that helps the student learn effectively.`;

    const synthesis = await orchestratorLlm.invoke([
      { role: "system", content: synthesisPrompt },
      { role: "user", content: "Please synthesize these worker results into a helpful response." }
    ]);
    
    // Update state with synthesis information
    state.lastAction = 'synthesized_response';
    state.context = {
      ...state.context,
      synthesisTimestamp: new Date().toISOString(),
      workerCount: workerResults.length,
    };
    
    console.log("✅ Synthesizer: Generated unified response");
    return { finalResponse: synthesis.content };
  } catch (error) {
    console.error("Error in synthesizer:", error);
    
    // Fallback: return the first worker's result
    if (state.workerResults && state.workerResults.length > 0) {
      return { finalResponse: state.workerResults[0].result };
    }
    
    return { finalResponse: "I apologize, but I encountered an error while processing your request. Please try again." };
  }
}

/**
 * Quality evaluator for response optimization
 */
export async function responseEvaluator(state: TutorStateType): Promise<{ needsImprovement: boolean; feedback: string }> {
  try {
    console.log("🔍 Response Evaluator: Checking response quality");
    
    const finalResponse = state.finalResponse;
    if (!finalResponse) {
      return { needsImprovement: true, feedback: "No response generated" };
    }
    
    const evaluationPrompt = `You are a quality evaluator for educational AI responses. Evaluate this response for educational effectiveness.

Response to evaluate:
"${finalResponse}"

Student Context:
- Level: ${state.studentLevel || 'intermediate'}
- Topic: ${state.currentTopic || 'Not specified'}

Evaluation Criteria:
1. Clarity and understandability
2. Educational value and depth
3. Appropriate difficulty level
4. Engagement and encouragement
5. Completeness of information

Rate each criterion from 1-5 and provide feedback. If any criterion scores below 3, the response needs improvement.`;

    const evaluation = await orchestratorLlm.invoke([
      { role: "system", content: evaluationPrompt },
      { role: "user", content: "Evaluate this response and provide feedback." }
    ]);
    
    // Simple evaluation logic - in production, this would be more sophisticated
    const responseLength = finalResponse.length;
    const hasEncouragement = finalResponse.toLowerCase().includes('great') || 
                            finalResponse.toLowerCase().includes('good') ||
                            finalResponse.toLowerCase().includes('excellent');
    const hasStructure = finalResponse.includes('\n') || finalResponse.includes('1.') || finalResponse.includes('•');
    
    const needsImprovement = responseLength < 100 || !hasEncouragement || !hasStructure;
    const feedback = needsImprovement ? 
      "Response could be more detailed, encouraging, or better structured" : 
      "Response meets quality standards";
    
    return { needsImprovement, feedback };
  } catch (error) {
    console.error("Error in response evaluator:", error);
    return { needsImprovement: false, feedback: "Evaluation failed" };
  }
}
