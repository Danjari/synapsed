import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const deck = await prisma.flashcardDeck.findUnique({
      where: { nodeId: params.nodeId },
      include: { cards: { orderBy: { order: 'asc' } } }
    });
    
    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }
    
    return NextResponse.json(deck);
  } catch (error) {
    console.error('Failed to fetch deck:', error);
    return NextResponse.json({ error: 'Failed to fetch deck' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const { cards } = await request.json();
    
    const deck = await prisma.flashcardDeck.update({
      where: { nodeId: params.nodeId },
      data: {
        cards: {
          deleteMany: {},
          create: cards.map((card: any, index: number) => ({
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
    console.error('Failed to update deck:', error);
    return NextResponse.json({ error: 'Failed to update deck' }, { status: 500 });
  }
} 