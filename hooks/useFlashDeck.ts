import { useState, useEffect } from 'react';
import { generateFlashcards } from '@/lib/flashcard/aiClient';

export function useFlashDeck(nodeId: string, nodeTitle?: string, markdownContent?: string, quizQuestions?: any[]) {
  const [deck, setDeck] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeck = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/flashcard/${nodeId}`);
      if (response.ok) {
        const data = await response.json();
        setDeck(data);
      } else if (response.status === 404) {
        setDeck(null); // No deck exists yet
      } else {
        setError('Failed to fetch deck');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateDeck = async () => {
    if (!nodeTitle || !markdownContent) {
      setError('Missing content for generation');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await generateFlashcards(nodeTitle, markdownContent, quizQuestions);
      setDeck(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (cardId: string, mastered: boolean) => {
    try {
      await fetch('/api/progress/flashcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, cardId, mastered })
      });
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  useEffect(() => {
    if (nodeId) {
      fetchDeck();
    }
  }, [nodeId]);

  return { 
    deck, 
    loading, 
    error, 
    generateDeck, 
    updateProgress, 
    refetch: fetchDeck 
  };
} 