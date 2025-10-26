import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { queryPinecone } from "@/lib/pinecone/queryPinecone";

// Enhanced tool to search through lesson materials and knowledge base
export const searchKnowledgeTool = new DynamicStructuredTool({
  name: "search_knowledge",
  description: "Search through lesson materials, course content, and knowledge base to find relevant information for answering student questions",
  schema: z.object({
    query: z.string().describe("The search query to find relevant information"),
    classId: z.string().optional().describe("The class ID to search within"),
    lessonId: z.string().optional().describe("The specific lesson ID to focus on"),
    searchType: z.enum(['concept', 'example', 'exercise', 'theory']).optional().describe("Type of content to search for"),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional().describe("Difficulty level filter"),
    limit: z.number().optional().default(5).describe("Maximum number of results to return")
  }),
  func: async (input: unknown) => {
    const { 
      query, 
      classId, 
      lessonId, 
      searchType, 
      difficulty, 
      limit = 5 
    } = input as { 
      query: string; 
      classId?: string; 
      lessonId?: string; 
      searchType?: string;
      difficulty?: string;
      limit?: number; 
    };
    
    try {
      console.log("🔍 Searching knowledge base for:", { query, classId, lessonId, searchType, difficulty });
      
      // Try to use Pinecone vector search first
      let results: Array<{
        content: string;
        source: string;
        relevance: number;
        type: string;
        difficulty: string;
        page?: number;
        lessonId?: string;
        classId?: string;
      }> = [];
      
      try {
        // For now, use the basic queryPinecone function
        // TODO: Enhance queryPinecone to support filtering options
        const vectorResults = await queryPinecone(query);
        
        if (vectorResults && vectorResults.length > 0) {
          results = vectorResults.map((result: {
            content?: string;
            text?: string;
            source?: string;
            metadata?: {
              source?: string;
              type?: string;
              difficulty?: string;
              page?: number;
              lessonId?: string;
              classId?: string;
            };
            score?: number;
          }) => ({
            content: result.content || result.text || "No content available",
            source: result.source || result.metadata?.source || "Course Material",
            relevance: result.score || 0.8,
            type: result.metadata?.type || 'concept',
            difficulty: result.metadata?.difficulty || 'intermediate',
            page: result.metadata?.page,
            lessonId: result.metadata?.lessonId,
            classId: result.metadata?.classId,
          }));
        }
      } catch (vectorError) {
        console.warn("Vector search failed, falling back to dummy data:", vectorError);
      }
      
      // Fallback to dummy data if vector search fails or returns no results
      if (results.length === 0) {
        const dummyKnowledgeBase = [
          {
            content: "Introduction to Machine Learning: Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn from data without being explicitly programmed.",
            source: "Chapter 1: Introduction",
            page: 1,
            relevance: 0.95,
            type: 'concept',
            difficulty: 'beginner'
          },
          {
            content: "Supervised Learning: In supervised learning, the algorithm learns from labeled training data to make predictions on new, unseen data. Examples include classification and regression tasks.",
            source: "Chapter 2: Supervised Learning",
            page: 15,
            relevance: 0.88,
            type: 'concept',
            difficulty: 'intermediate'
          },
          {
            content: "Neural Networks: Neural networks are computing systems inspired by biological neural networks. They consist of interconnected nodes (neurons) that process information using a connectionist approach.",
            source: "Chapter 3: Neural Networks",
            page: 42,
            relevance: 0.82,
            type: 'theory',
            difficulty: 'intermediate'
          },
          {
            content: "Deep Learning: Deep learning is a subset of machine learning that uses neural networks with multiple layers (deep neural networks) to model and understand complex patterns in data.",
            source: "Chapter 4: Deep Learning",
            page: 67,
            relevance: 0.78,
            type: 'concept',
            difficulty: 'advanced'
          },
          {
            content: "Data Preprocessing: Before training machine learning models, data often needs to be cleaned, normalized, and transformed. This includes handling missing values, encoding categorical variables, and scaling features.",
            source: "Chapter 5: Data Preprocessing",
            page: 89,
            relevance: 0.75,
            type: 'example',
            difficulty: 'intermediate'
          }
        ];

        // Apply filters to dummy data
        const queryLower = query.toLowerCase();
        results = dummyKnowledgeBase
          .filter(item => {
            const matchesQuery = item.content.toLowerCase().includes(queryLower) ||
                               item.source.toLowerCase().includes(queryLower);
            const matchesType = !searchType || item.type === searchType;
            const matchesDifficulty = !difficulty || item.difficulty === difficulty;
            return matchesQuery && matchesType && matchesDifficulty;
          })
          .slice(0, limit);
      }

      if (results.length === 0) {
        return `No relevant information found for "${query}" in the current lesson materials. Try asking about machine learning, neural networks, or data preprocessing.`;
      }

      // Format the results for the agent
      const formattedResults = results.map((result, index) => {
        return `Result ${index + 1}:
Content: ${result.content}
Source: ${result.source}
${result.page ? `Page: ${result.page}` : ''}
Type: ${result.type}
Difficulty: ${result.difficulty}
Relevance: ${result.relevance}`;
      }).join('\n\n');

      return `Found ${results.length} relevant results for "${query}":\n\n${formattedResults}`;
    } catch (error) {
      console.error("Error searching knowledge base:", error);
      return "I encountered an error while searching the knowledge base. Please try again.";
    }
  }
});

// Tool to get current lesson context
export const getLessonContextTool = new DynamicStructuredTool({
  name: "get_lesson_context",
  description: "Get information about the current lesson, class, and learning context",
  schema: z.object({
    classId: z.string().optional().describe("The class ID"),
    lessonId: z.string().optional().describe("The lesson ID")
  }),
  func: async (input: unknown) => {
    const { classId, lessonId } = input as { classId?: string; lessonId?: string };
    try {
      console.log("📚 Getting lesson context for:", { classId, lessonId });
      
      // Dummy lesson context for testing
      const dummyContext = {
        classId: classId || "CS-3010",
        lessonId: lessonId || "ML-Intro",
        className: "Introduction to Machine Learning",
        lessonTitle: "Fundamentals of Machine Learning",
        currentTopic: "Supervised Learning Algorithms",
        progress: "25%",
        availableMaterials: [
          "Lecture slides on supervised learning",
          "Hands-on coding exercises",
          "Dataset for practice",
          "Additional reading materials"
        ],
        nextTopics: [
          "Neural Networks",
          "Deep Learning",
          "Unsupervised Learning"
        ]
      };

      return `Current lesson context:
📚 Class: ${dummyContext.className} (${dummyContext.classId})
📖 Lesson: ${dummyContext.lessonTitle} (${dummyContext.lessonId})
🎯 Current Topic: ${dummyContext.currentTopic}
📊 Progress: ${dummyContext.progress} complete

📋 Available Materials:
${dummyContext.availableMaterials.map(material => `• ${material}`).join('\n')}

🔮 Upcoming Topics:
${dummyContext.nextTopics.map(topic => `• ${topic}`).join('\n')}

💡 You can ask me about any of these topics or request help with specific concepts!`;
    } catch (error) {
      console.error("Error getting lesson context:", error);
      return "Unable to retrieve current lesson context.";
    }
  }
});

// Tool to remember important conversation points
export const rememberConversationTool = new DynamicStructuredTool({
  name: "remember_conversation",
  description: "Store important information from the conversation for future reference",
  schema: z.object({
    key: z.string().describe("The key or topic to remember"),
    value: z.string().describe("The information to store"),
    importance: z.enum(["low", "medium", "high"]).optional().default("medium").describe("How important this information is")
  }),
  func: async (input: unknown) => {
    const { key, value, importance = "medium" } = input as { key: string; value: string; importance?: string };
    try {
      console.log("💾 Remembering conversation point:", { key, value, importance });
      
      // This would typically store in a database or memory system
      // For now, just return confirmation
      return `I've noted this important point: "${key}" - ${value} (Importance: ${importance})`;
    } catch (error) {
      console.error("Error remembering conversation:", error);
      return "I couldn't save that information right now.";
    }
  }
});

// Tool to assess student understanding
export const assessUnderstandingTool = new DynamicStructuredTool({
  name: "assess_understanding",
  description: "Assess student understanding of a topic and identify knowledge gaps",
  schema: z.object({
    topic: z.string().describe("The topic to assess understanding for"),
    studentResponse: z.string().describe("The student's response or explanation"),
    expectedLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional().describe("Expected understanding level")
  }),
  func: async (input: unknown) => {
    const { topic, studentResponse, expectedLevel } = input as { 
      topic: string; 
      studentResponse: string; 
      expectedLevel?: string; 
    };
    try {
      console.log("📊 Assessing understanding for:", { topic, expectedLevel });
      
      // Simple assessment logic - in production, this would use an LLM
      const responseLength = studentResponse.length;
      const hasKeywords = ['understand', 'know', 'learned', 'clear'].some(keyword => 
        studentResponse.toLowerCase().includes(keyword)
      );
      const hasQuestions = studentResponse.includes('?');
      
      let understanding: 'low' | 'medium' | 'high' = 'medium';
      const gaps: string[] = [];
      const recommendations: string[] = [];
      
      if (responseLength < 50) {
        understanding = 'low';
        gaps.push('Insufficient explanation depth');
        recommendations.push('Provide more detailed explanation');
      } else if (responseLength > 200 && hasKeywords && !hasQuestions) {
        understanding = 'high';
        recommendations.push('Ready for advanced topics');
      }
      
      if (hasQuestions) {
        gaps.push('Uncertainty about key concepts');
        recommendations.push('Clarify specific questions');
      }
      
      return JSON.stringify({
        understanding,
        gaps,
        recommendations,
        nextSteps: recommendations.slice(0, 2)
      });
    } catch (error) {
      console.error("Error assessing understanding:", error);
      return "Unable to assess understanding at this time.";
    }
  }
});

// Tool to generate personalized explanations
export const generateExplanationTool = new DynamicStructuredTool({
  name: "generate_explanation",
  description: "Generate personalized explanations based on student level and context",
  schema: z.object({
    concept: z.string().describe("The concept to explain"),
    studentLevel: z.enum(['beginner', 'intermediate', 'advanced']).describe("Student's current level"),
    context: z.string().optional().describe("Additional context about what the student is learning"),
    explanationType: z.enum(['step-by-step', 'analogy', 'example', 'visual']).optional().describe("Type of explanation preferred")
  }),
  func: async (input: unknown) => {
    const { concept, studentLevel, explanationType } = input as { 
      concept: string; 
      studentLevel: string; 
      context?: string; 
      explanationType?: string; 
    };
    try {
      console.log("📚 Generating explanation for:", { concept, studentLevel, explanationType });
      
      // This would typically use an LLM to generate personalized explanations
      const explanations = {
        beginner: {
          'step-by-step': `Let me break down ${concept} into simple steps:\n\n1. First, let's understand the basic idea...\n2. Then, we'll see how it works...\n3. Finally, we'll practice with an example.`,
          'analogy': `Think of ${concept} like learning to ride a bike - you start with training wheels (basic concepts) and gradually build confidence.`,
          'example': `Here's a simple example of ${concept}: Imagine you're organizing your bookshelf - that's similar to how ${concept} works.`
        },
        intermediate: {
          'step-by-step': `Let's explore ${concept} systematically:\n\n1. Core principles and mechanisms\n2. Key components and their interactions\n3. Practical applications and variations`,
          'analogy': `${concept} is like a complex recipe - you need to understand each ingredient (component) and how they work together.`,
          'example': `Consider this real-world scenario involving ${concept}: [Detailed example with multiple factors]`
        },
        advanced: {
          'step-by-step': `Advanced analysis of ${concept}:\n\n1. Theoretical foundations and mathematical principles\n2. Implementation details and optimization strategies\n3. Edge cases and advanced applications`,
          'analogy': `${concept} operates like a sophisticated orchestra - each component must be precisely coordinated for optimal performance.`,
          'example': `In advanced applications, ${concept} demonstrates complex behaviors such as [technical details]`
        }
      };
      
      const levelExplanations = explanations[studentLevel as keyof typeof explanations];
      const type = explanationType || 'step-by-step';
      const explanation = levelExplanations[type as keyof typeof levelExplanations] || levelExplanations['step-by-step'];
      
      return explanation;
    } catch (error) {
      console.error("Error generating explanation:", error);
      return "Unable to generate explanation at this time.";
    }
  }
});

// Tool to create practice exercises
export const createExerciseTool = new DynamicStructuredTool({
  name: "create_exercise",
  description: "Create practice exercises tailored to student level and topic",
  schema: z.object({
    topic: z.string().describe("The topic for the exercise"),
    studentLevel: z.enum(['beginner', 'intermediate', 'advanced']).describe("Student's current level"),
    exerciseType: z.enum(['multiple-choice', 'short-answer', 'problem-solving', 'coding']).optional().describe("Type of exercise"),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional().describe("Exercise difficulty")
  }),
  func: async (input: unknown) => {
    const { topic, studentLevel, exerciseType, difficulty } = input as { 
      topic: string; 
      studentLevel: string; 
      exerciseType?: string; 
      difficulty?: string; 
    };
    try {
      console.log("📝 Creating exercise for:", { topic, studentLevel, exerciseType, difficulty });
      
      // Generate exercise based on parameters
      const exercise = {
        question: `Practice Exercise: ${topic}`,
        type: exerciseType || 'short-answer',
        difficulty: difficulty || 'medium',
        instructions: `Based on your ${studentLevel} level, here's a ${difficulty || 'medium'} difficulty exercise about ${topic}.`,
        sampleAnswer: `This is a sample answer for the ${topic} exercise at ${studentLevel} level.`,
        hints: [
          `Think about the key concepts of ${topic}`,
          `Consider how ${topic} relates to what you've learned`,
          `Don't worry if you're not sure - learning is a process!`
        ]
      };
      
      return JSON.stringify(exercise);
    } catch (error) {
      console.error("Error creating exercise:", error);
      return "Unable to create exercise at this time.";
    }
  }
});

// Export all tools
export const tutorTools = [
  searchKnowledgeTool,
  getLessonContextTool,
  rememberConversationTool,
  assessUnderstandingTool,
  generateExplanationTool,
  createExerciseTool
];
