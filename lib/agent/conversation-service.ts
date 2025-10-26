import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ConversationData {
  threadId: string;
  userId: string;
  classId?: string;
  lessonId?: string;
  title?: string;
  messages: ConversationMessage[];
}

export class ConversationService {
  // Save or update a conversation
  static async saveConversation(data: ConversationData) {
    try {
      // Check if conversation exists
      const existingConversation = await prisma.conversation.findUnique({
        where: { threadId: data.threadId },
        include: { messages: true }
      });

      if (existingConversation) {
        // Update existing conversation
        await prisma.conversation.update({
          where: { threadId: data.threadId },
          data: {
            updatedAt: new Date(),
            title: data.title || existingConversation.title,
            classId: data.classId || existingConversation.classId,
            lessonId: data.lessonId || existingConversation.lessonId,
          }
        });

        // Add new messages
        for (const message of data.messages) {
          await prisma.message.create({
            data: {
              conversationId: existingConversation.id,
              role: message.role.toUpperCase() as 'USER' | 'ASSISTANT',
              content: message.content,
              timestamp: message.timestamp || new Date()
            }
          });
        }

        return existingConversation;
      } else {
        // Create new conversation
        const conversation = await prisma.conversation.create({
          data: {
            threadId: data.threadId,
            userId: data.userId,
            classId: data.classId,
            lessonId: data.lessonId,
            title: data.title,
            messages: {
              create: data.messages.map(msg => ({
                role: msg.role.toUpperCase() as 'USER' | 'ASSISTANT',
                content: msg.content,
                timestamp: msg.timestamp || new Date()
              }))
            }
          },
          include: { messages: true }
        });

        return conversation;
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  }

  // Get conversation by thread ID
  static async getConversation(threadId: string) {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { threadId },
        include: { 
          messages: { 
            orderBy: { timestamp: 'asc' } 
          },
          user: true,
          class: true
        }
      });

      return conversation;
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  }

  // Get all conversations for a user
  static async getUserConversations(userId: string, limit = 20) {
    try {
      const conversations = await prisma.conversation.findMany({
        where: { userId },
        include: { 
          messages: { 
            orderBy: { timestamp: 'desc' },
            take: 1 // Get only the latest message for preview
          },
          class: true
        },
        orderBy: { updatedAt: 'desc' },
        take: limit
      });

      return conversations;
    } catch (error) {
      console.error('Error getting user conversations:', error);
      throw error;
    }
  }

  // Delete a conversation
  static async deleteConversation(threadId: string) {
    try {
      await prisma.conversation.delete({
        where: { threadId }
      });
      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  // Update conversation title
  static async updateConversationTitle(threadId: string, title: string) {
    try {
      const conversation = await prisma.conversation.update({
        where: { threadId },
        data: { title }
      });
      return conversation;
    } catch (error) {
      console.error('Error updating conversation title:', error);
      throw error;
    }
  }
}
