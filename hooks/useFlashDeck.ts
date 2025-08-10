import { useState, useEffect, useCallback } from 'react';
import { generateFlashcards } from '@/lib/flashcard/aiClient';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  hint?: string;
  tags: string[];
  type: string;
  order: number;
}

interface FlashcardDeck {
  id: string;
  nodeId: string;
  title: string;
  cards: Flashcard[];
  lastGenerated: string;
  createdAt: string;
  updatedAt: string;
}

interface QuizQuestion {
  question: string;
  answer: string;
  options?: string[];
}

export function useFlashDeck(nodeId: string, nodeTitle?: string, markdownContent?: string, quizQuestions?: QuizQuestion[]) {
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeck = useCallback(async () => {
    console.log('fetchDeck called for nodeId:', nodeId);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deck');
    } finally {
      setLoading(false);
    }
  }, [nodeId]);

  const generateDeck = useCallback(async () => {
    if (!nodeTitle || !markdownContent) {
      setError('Missing content for generation');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await generateFlashcards(nodeId, nodeTitle, markdownContent, quizQuestions);
      setDeck(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate deck');
    } finally {
      setLoading(false);
    }
  }, [nodeId, nodeTitle, markdownContent, quizQuestions]);

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
    console.log('useEffect triggered for nodeId:', nodeId);
    if (nodeId) {
      fetchDeck();
    }
  }, [nodeId]); // Remove fetchDeck from dependencies since it's already memoized

  // Only fetch deck when nodeId changes, not when markdownContent changes
  // markdownContent is only used for generation, not fetching

  return { 
    deck, 
    loading, 
    error, 
    generateDeck, 
    updateProgress, 
    refetch: fetchDeck 
  };
} 