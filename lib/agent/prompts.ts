/**
 * Centralized prompt functions for AI agent interactions
 * All agent-related prompts should be stored here for easy maintenance
 */

/**
 * Generates a Socratic introduction prompt for when a student first clicks on a node
 * Uses Socratic teaching method to introduce topics through guided questions
 * 
 * @param nodeTitle - The title/name of the topic/node being introduced
 * @param studentName - The name of the student (defaults to "there" if not provided)
 * @returns A formatted prompt string for the AI agent
 */
export function getSocraticIntroductionPrompt(
  nodeTitle: string,
  studentName: string = "there"
): string {
  return `You are an AI tutor using the Socratic teaching method. Introduce the topic "${nodeTitle}" to ${studentName} by:

1. Starting with an engaging, thought-provoking question that connects to their prior knowledge and makes them curious about ${nodeTitle}
2. Using questions to guide their learning rather than lecturing - help them discover concepts through dialogue
3. Building on their responses with follow-up questions that encourage critical thinking
4. Making the conversation interactive and conversational

Begin immediately with your opening question about ${nodeTitle}. Do not explain your teaching method - just start teaching!`;
}

/**
 * Checks if a message is a system/introduction message that should be hidden from the UI
 * This allows us to filter out auto-generated introduction prompts when loading conversations
 * 
 * @param messageContent - The content of the message to check
 * @returns true if the message is a system introduction message
 */
export function isSystemIntroductionMessage(messageContent: string): boolean {
  // Check if the message matches the pattern of our Socratic introduction prompt
  // This matches the beginning of the prompt that contains the key identifier
  const systemMessageIndicators = [
    'You are an AI tutor using the Socratic teaching method',
    'Introduce the topic',
    'Starting with an engaging, thought-provoking question',
    'Begin immediately with your opening question'
  ]
  
  return systemMessageIndicators.some(indicator => 
    messageContent.includes(indicator)
  )
}

