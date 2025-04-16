// // /app/api/pathway/route.ts
// import { NextResponse } from 'next/server';

// export async function GET(req: Request) {
//   const { searchParams } = new URL(req.url);
//   const studentId = searchParams.get('studentId') || 'demo';
//   const classId = searchParams.get('classId') || 'default';

//   // You can customize this mock based on studentId or classId
//   const mockNodes = [
//     {
//       id: '1',
//       title: 'Understanding Functions',
//       description: 'Explore basic definitions and examples of functions.',
//       type: 'topic',
//       difficulty: 'beginner',
//       duration: '1 week',
//       dependsOn: [],
//       markdownContent: `### Understanding Functions\nA **function** maps an input to an output.`
//     },
//     {
//       id: '2',
//       title: 'Linear Functions',
//       description: 'Explore slope, y-intercept, and graph interpretation.',
//       type: 'subtopic',
//       difficulty: 'beginner',
//       duration: '1 week',
//       dependsOn: ['1'],
//       markdownContent: `### Linear Functions\nA linear function has the form: \n\`\`\`math\ny = mx + b\n\`\`\``
//     },
//     {
//       id: '3',
//       title: 'Applications of Linear Models',
//       description: 'Solve real-life problems using linear equations.',
//       type: 'assessment',
//       difficulty: 'intermediate',
//       duration: '1 week',
//       dependsOn: ['2'],
//       markdownContent: `### Assessment\nUse a real-life dataset to fit a linear model.`
//     }
//   ];

//   return NextResponse.json(mockNodes);
// }


// /app/api/pathway/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get('prompt') || 'Intro to linear algebra';
  const studentId = searchParams.get('studentId') || 'demo';
  const classId = searchParams.get('classId') || 'default';
  console.log("prompt received", prompt)
  console.log("studentId received", studentId)
  console.log("ClassID received", classId)

  const generatePathwayFunction = {
    name: 'generate_learning_pathway',
    description: 'Generate a learning pathway of 8-12 structured nodes for a student based on a course prompt.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        nodes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              type: {
                type: Type.STRING,
                enum: ['topic', 'subtopic', 'resource', 'assessment']
              },
              difficulty: {
                type: Type.STRING,
                enum: ['beginner', 'intermediate', 'advanced']
              },
              duration: { type: Type.STRING },
              dependsOn: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['id', 'title', 'description', 'type', 'difficulty', 'duration', 'dependsOn']
          }
        }
      },
      required: ['nodes']
    }
  };
  

  const response = await ai.models.generateContent({
    model:'gemini-2.0-flash',
     contents: `
    Generate a learning pathway for the course "${prompt}".
    Return it by calling the function \`generate_learning_pathway\` with 8 to 12 nodes in the "nodes" array.
    Each node should be modular, with dependencies indicated using "dependsOn" by ID.
    `
    ,
    config: {
      tools: [{
        functionDeclarations: [generatePathwayFunction]
      }]
    }
  });

  const functionCall = response.functionCalls?.[0];
  const nodes = functionCall?.args?.nodes;
  
  if (!nodes) {
    return NextResponse.json({ error: 'No nodes returned' }, { status: 500 });
  }
  
  return NextResponse.json(nodes);
}
