// // pages/api/chat.ts
// import { NextRequest, NextResponse } from 'next/server';
// import OpenAI from 'openai';

// // Initialize OpenAI client
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export async function POST(
//   req: NextRequest
// ) {

//   try {
//     const { messages } = await req.json();
//     console.log(req.body);

//     if (!messages || !Array.isArray(messages)) {
//       return NextResponse.json({ error: 'Invalid request body' });
//     }

//     // Format messages for OpenAI API
//     const formattedMessages = messages.map(msg => ({
//       role: msg.role,
//       content: msg.content
//     }));

//     // Call OpenAI API
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o",
//       messages: formattedMessages,
//     });

//     // Extract the assistant's message
//     const assistantMessage = completion.choices[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';

//     return NextResponse.json({ message: assistantMessage });
//   } catch (error) {
//     console.error('Error calling OpenAI API:', error);
//     return NextResponse.json({ error: 'Failed to process request' });
//   }
// }

// using Gemini cause it is cheaper and still really good. 
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY!});

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Convert to Gemini format
    const formattedMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));

   

    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: formattedMessages,
    });

    const text = result.text;

    return NextResponse.json({ message: text });
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
