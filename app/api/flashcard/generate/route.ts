import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface FlashcardData {
  question: string;
  answer: string;
  hint?: string;
  tags?: string[];
  type?: string;
}

// Simple Gemini client function (you can replace this with your actual Gemini setup)
async function callGemini(): Promise<string> {
  // For now, we'll use a mock response. Replace this with your actual Gemini API call
  const mockResponse = `[
    {
      "question": "What is the main focus of this lesson?",
      "answer": "Understanding and applying the core concepts presented in this lesson to build a strong foundation for future learning.",
      "hint": "Think about the primary learning objective",
      "tags": ["concept", "basics"],
      "type": "concept"
    },
    {
      "question": "How should you apply the knowledge from this lesson?",
      "answer": "By connecting theoretical concepts to practical scenarios and using the knowledge as building blocks for more advanced topics.",
      "hint": "Consider real-world applications",
      "tags": ["concept", "application"],
      "type": "concept"
    },
    {
      "question": "What are the key principles discussed in this lesson?",
      "answer": "The lesson covers fundamental principles that form the basis for understanding more complex topics in this subject area.",
      "hint": "Look for recurring themes",
      "tags": ["concept", "principles"],
      "type": "concept"
    },
    {
      "question": "How does this lesson connect to previous topics?",
      "answer": "This lesson builds upon foundational knowledge and creates connections to previously learned concepts.",
      "hint": "Think about dependencies",
      "tags": ["concept", "connections"],
      "type": "concept"
    },
    {
      "question": "What practical skills can you develop from this lesson?",
      "answer": "You can develop analytical thinking, problem-solving abilities, and practical application skills.",
      "hint": "Focus on actionable skills",
      "tags": ["quiz", "skills"],
      "type": "quiz"
    },
    {
      "question": "Which of the following best describes the main concept?",
      "answer": "The main concept involves understanding fundamental principles and their practical applications.",
      "hint": "This question will appear in the quiz",
      "tags": ["quiz", "assessment"],
      "type": "quiz"
    },
    {
      "question": "What is the relationship between theory and practice in this lesson?",
      "answer": "Theory provides the foundation while practice helps reinforce understanding and develop skills.",
      "hint": "Consider the balance between concepts and application",
      "tags": ["quiz", "theory"],
      "type": "quiz"
    },
    {
      "question": "How can you measure your understanding of this lesson?",
      "answer": "Through self-assessment, practice exercises, and applying concepts to real-world scenarios.",
      "hint": "Think about evaluation methods",
      "tags": ["quiz", "evaluation"],
      "type": "quiz"
    }
  ]`;
  
  return mockResponse;
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST request received');
    const body = await request.json();
    console.log('Request body:', body);
    
    const { nodeId, nodeTitle, markdownContent } = body;
    
    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });
    }
    
    console.log('Starting flashcard generation for nodeId:', nodeId);
    
    // Check if PathwayNode exists, if not create a temporary one for testing
    let pathwayNode = await prisma.pathwayNode.findUnique({
      where: { id: nodeId }
    });
    
    if (!pathwayNode) {
      // Create a temporary pathway and node for testing
      const tempPathway = await prisma.learningPathway.create({
        data: {
          studentId: '507f1f77bcf86cd799439012', // Use a proper ObjectID
          classId: '507f1f77bcf86cd799439013',   // Use a proper ObjectID
          status: 'pending'
        }
      });
      
      pathwayNode = await prisma.pathwayNode.create({
        data: {
          id: nodeId,
          pathwayId: tempPathway.id,
          nodeId: nodeId,
          title: nodeTitle || 'Test Node',
          description: markdownContent || 'Test content',
          type: 'topic',
          difficulty: 'beginner',
          duration: '30 minutes',
          dependsOn: []
        }
      });
    }
    
    console.log('About to call Gemini');
    
    // Generate flashcards using Gemini
    const aiResponse = await callGemini();
    console.log('Gemini response received:', aiResponse);
    
    // Parse JSON response with error handling
    let cardsData;
    try {
      cardsData = JSON.parse(aiResponse);
      console.log('Parsed cards data:', cardsData);
    } catch (parseError) {
      console.error('Failed to parse AI response:', String(parseError));
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 });
    }
    
    // Validate cards structure
    if (!Array.isArray(cardsData)) {
      console.error('Cards data is not an array:', cardsData);
      return NextResponse.json({ error: 'Invalid cards format' }, { status: 500 });
    }
    
    // Save to database
    const deck = await prisma.flashcardDeck.upsert({
      where: { nodeId },
      update: {
        title: nodeTitle,
        lastGenerated: new Date(),
        cards: {
          deleteMany: {},
          create: cardsData.map((card: FlashcardData, index: number) => ({
            question: card.question,
            answer: card.answer,
            hint: card.hint || null,
            tags: card.tags || [],
            type: card.type || 'concept',
            order: index + 1
          }))
        }
      },
      create: {
        nodeId,
        title: nodeTitle,
        cards: {
          create: cardsData.map((card: FlashcardData, index: number) => ({
            question: card.question,
            answer: card.answer,
            hint: card.hint || null,
            tags: card.tags || [],
            type: card.type || 'concept',
            order: index + 1
          }))
        }
      },
      include: { cards: { orderBy: { order: 'asc' } } }
    });
    
    return NextResponse.json(deck);
  } catch (error) {
    console.error('Flashcard generation error:', String(error));
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
} 