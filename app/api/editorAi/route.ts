import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    // Choose AI provider based on env or request
    const provider = process.env.NEXT_PUBLIC_AI_PROVIDER || 'openai';
    
    let response;
    switch (provider) {
      case 'openai':
        response = await callOpenAI(prompt);
        break;
      case 'claude':
        response = await callClaude(prompt);
        break;
      case 'gemini':
        response = await callGemini(prompt);
        break;
      default:
        response = await callOpenAI(prompt);
    }
    
    return NextResponse.json({ content: response });
  } catch {
    return NextResponse.json(
      { error: 'AI request failed' },
      { status: 500 }
    );
  }
}

async function callOpenAI(prompt: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
    }),
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}

async function callClaude(prompt: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 500,
      messages: [
        { role: 'user', content: prompt }
      ],
    }),
  });
  
  const data = await response.json();
  return data.content[0].text;
}

async function callGemini(prompt: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
    }),
  });
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}