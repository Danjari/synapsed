/**
 * Centralized prompt functions for AI agent interactions
 * All agent-related prompts should be stored here for easy maintenance
 */

/**
 * Generates a Socratic introduction prompt for when a student first clicks on a node
 * Uses Socratic teaching method to introduce topics through guided questions
 * IMPORTANT: This prompt will trigger RAG search to fetch class content first
 * 
 * @param nodeTitle - The title/name of the topic/node being introduced
 * @param studentName - The name of the student (defaults to "there" if not provided)
 * @param classId - The class ID for RAG search (required for RAG to work)
 * @returns A formatted prompt string for the AI agent
 */
export function getSocraticIntroductionPrompt(
  nodeTitle: string,
  studentName: string = "there",
  classId?: string
): string {
  // If classId is provided, instruct the agent to use RAG first
  if (classId) {
    return `You are an AI tutor using the Socratic teaching method. A student is starting to learn about "${nodeTitle}".

CRITICAL FIRST STEP: Before introducing the topic, you MUST use the searchClassContent tool to retrieve relevant information about "${nodeTitle}" from the class materials. This ensures you have accurate, up-to-date information about what this topic covers in this specific class.

After retrieving the information:
1. Use the retrieved content to introduce "${nodeTitle}" to ${studentName} with an engaging, thought-provoking question that connects to their prior knowledge
2. Reference specific information from the class materials when relevant
3. Use questions to guide their learning rather than lecturing - help them discover concepts through dialogue
4. Build on their responses with follow-up questions that encourage critical thinking
5. Make the conversation interactive and conversational

IMPORTANT: You MUST call searchClassContent with query="${nodeTitle}" and classId="${classId}" FIRST before responding. Do not skip this step.`;
  }

  // Fallback if no classId (shouldn't happen in normal flow)
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

