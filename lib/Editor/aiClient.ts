export async function callAI(action: string, selectedText: string) {
    const prompt = getPromptForAction(action, selectedText);
    const requestBody = { action, text: selectedText, prompt };
    
    console.log('Sending AI request:', requestBody);
    
    const response = await fetch('/api/editorAi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      throw new Error('AI request failed');
    }
    
    const data = await response.json();
    return data.content;
  }
  
  function getPromptForAction(action: string, selectedText: string) {
    switch (action) {
      case 'explain':
        return `Explain this text in simple terms: "${selectedText}"`;
      case 'summarize':
        return `Summarize this text in 2-3 sentences: "${selectedText}"`;
      case 'quiz-me':
        return `Create 3 multiple choice questions based on: "${selectedText}"`;
      case 'diagram':
        return `Create a mermaid diagram for: "${selectedText}"`;
      default:
        return `Process this text: "${selectedText}"`;
    }
  }