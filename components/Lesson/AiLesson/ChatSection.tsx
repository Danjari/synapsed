"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Plus } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"
import { getSocraticIntroductionPrompt, isSystemIntroductionMessage } from "@/lib/agent/prompts"

// Custom styles for math rendering
const mathStyles = `
  .katex {
    font-size: 1.1em;
  }
  .katex-display {
    margin: 1em 0;
    text-align: center;
  }
  .katex .base {
    margin: 0.1em 0;
  }
`
interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

interface ChatSectionProps {
  onAddToNotes?: (content: string) => void
  classId?: string
  lessonId?: string
  userId?: string
  nodeTitle?: string
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = (now.getTime() - date.getTime()) / 1000
  if (diff < 10) return "Just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

// Removed suggested prompts since we're going straight to chat

// Helper function to clean AI responses
const cleanAIResponse = (content: string): string => {
  return content
    .replace(/^FINAL ANSWER\s*:?/i, "")
    .replace(/^ANSWER\s*:?/i, "")
    .replace(/^RESPONSE\s*:?/i, "")
    .trim()
}

// Helper function to convert common math patterns to LaTeX
const convertMathToLatex = (content: string): string => {
  return content
    // Convert x^2 patterns to LaTeX
    .replace(/(\w+)\^(\d+)/g, '$$1^{$2}$')
    // Convert fractions like 1/2 to LaTeX
    .replace(/(\d+)\/(\d+)/g, '$\\frac{$1}{$2}$')
    // Convert sqrt patterns
    .replace(/sqrt\(([^)]+)\)/g, '$\\sqrt{$1}$')
    // Convert integral patterns
    .replace(/∫/g, '$\\int$')
    // Convert sum patterns
    .replace(/∑/g, '$\\sum$')
    // Convert pi
    .replace(/π/g, '$\\pi$')
    // Convert infinity
    .replace(/∞/g, '$\\infty$')
}

export default function ChatPage({ onAddToNotes, classId, lessonId, userId: propUserId, nodeTitle: propNodeTitle }: ChatSectionProps = {}) {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const userId = propUserId || (session?.user as { id?: string })?.id
  const studentName = (session?.user as { name?: string })?.name || "there"
  const nodeTitle = propNodeTitle || searchParams.get('nodeTitle') || ''
  
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [isLoadingConversation, setIsLoadingConversation] = useState(true)
  const [hasTriggeredIntroduction, setHasTriggeredIntroduction] = useState(false)
  // Removed isChatMode since we're always in chat mode
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesRef = useRef<Message[]>([])
  
  // Keep ref in sync with messages state
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }

  useEffect(() => {
    // Only scroll to bottom when new messages are added
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        scrollToBottom()
      }, 100) // Small delay to ensure DOM is updated
      return () => clearTimeout(timer)
    }
  }, [messages.length])

  // Autofocus input on load
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  // Load existing conversation on mount
  useEffect(() => {
    async function loadConversation() {
      if (!userId || !classId || !lessonId) {
        setIsLoadingConversation(false)
        return
      }

      try {
        const response = await fetch(
          `/api/conversations/by-lesson?userId=${userId}&classId=${classId}&lessonId=${lessonId}`
        )
        
        if (!response.ok) {
          throw new Error('Failed to load conversation')
        }

        const data = await response.json()
        
        if (data.conversation) {
          // Set threadId for agent memory continuity
          setThreadId(data.conversation.threadId)
          
          // Load messages into state, filtering out system introduction messages
          const loadedMessages: Message[] = data.conversation.messages
            .map((msg: {
              id: string
              content: string
              role: 'USER' | 'ASSISTANT'
              timestamp: string
            }) => ({
              id: msg.id,
              content: msg.content,
              role: msg.role.toLowerCase() as 'user' | 'assistant',
              timestamp: new Date(msg.timestamp),
            }))
            .filter((msg: Message) => {
              // Filter out user messages that are system introduction prompts
              if (msg.role === 'user' && isSystemIntroductionMessage(msg.content)) {
                return false
              }
              return true
            })
          
          setMessages(loadedMessages)
        }
      } catch (error) {
        console.error('Error loading conversation:', error)
        // If error, just continue with empty messages
      } finally {
        setIsLoadingConversation(false)
      }
    }

    loadConversation()
  }, [userId, classId, lessonId])

  // Removed timestamp update interval to prevent unnecessary re-renders

  // Removed startChat function since we're going straight to chat

  // Helper function to send a system message that won't be displayed in UI
  // Used for auto-introductions to make it look like the AI initiated the conversation
  const sendSystemMessage = useCallback(async (messageContent: string) => {
    if (isTyping) return

    setIsTyping(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }

    try {
      // Prepare messages array with the system message (but don't add to UI)
      const currentMessages = messagesRef.current
      const systemUserMessage = {
        role: "user" as const,
        content: messageContent
      }

      const response = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...currentMessages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            systemUserMessage
          ],
          threadId, // Use existing threadId if available
          classId,
          lessonId,
          userId
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to get response')
      }
      
      const data = await response.json()
      
      // Update threadId if returned from API (for new conversations)
      if (data.threadId && data.threadId !== threadId) {
        setThreadId(data.threadId)
      }
      
      // Only add the assistant response to the UI (system message stays hidden)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: convertMathToLatex(cleanAIResponse(data.response)),
        role: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        role: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }, [threadId, classId, lessonId, userId, isTyping])

  // Helper function to send a message (used for user-initiated messages)
  const sendMessage = useCallback(async (messageContent: string) => {
    if (isTyping) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      role: "user",
      timestamp: new Date(),
    }

    // Add user message to state optimistically
    const updatedMessages = [...messagesRef.current, userMessage]
    setMessages(updatedMessages)
    setIsTyping(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }

    try {
      const response = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          threadId, // Use existing threadId if available
          classId,
          lessonId,
          userId
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to get response')
      }
      
      const data = await response.json()
      
      // Update threadId if returned from API (for new conversations)
      if (data.threadId && data.threadId !== threadId) {
        setThreadId(data.threadId)
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: convertMathToLatex(cleanAIResponse(data.response)),
        role: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        role: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }, [threadId, classId, lessonId, userId, isTyping])

  // Auto-trigger Socratic introduction when conversation is empty (first time clicking a node)
  useEffect(() => {
    if (
      !isLoadingConversation &&
      messages.length === 0 &&
      !hasTriggeredIntroduction &&
      nodeTitle &&
      userId &&
      classId &&
      lessonId
    ) {
      setHasTriggeredIntroduction(true)
      
      // Get Socratic introduction prompt from centralized prompts file
      const introPrompt = getSocraticIntroductionPrompt(nodeTitle, studentName)

      // Automatically send the introduction as a system message (hidden from UI)
      sendSystemMessage(introPrompt)
    }
  }, [isLoadingConversation, messages.length, hasTriggeredIntroduction, nodeTitle, userId, classId, lessonId, studentName, sendSystemMessage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isTyping) return

    const messageContent = input.trim()
    if (!messageContent) return
    
    setInput("")
    await sendMessage(messageContent)
  }

  // Removed handleSuggestedPrompt since we're going straight to chat

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)

    // Auto-resize textarea up to 5 lines
    const textarea = e.target
    textarea.style.height = "auto"
    const scrollHeight = textarea.scrollHeight
    const lineHeight = 22
    const maxHeight = 5 * lineHeight + 24 // 5 lines + padding
    textarea.style.height = Math.min(scrollHeight, maxHeight) + "px"
  }

  return (<div className="h-full bg-white flex flex-col font-system overflow-hidden">
    <style dangerouslySetInnerHTML={{ __html: mathStyles }} />
    {/* Chat Messages */}
    <div className="flex-1 overflow-hidden">
      <div className="h-full overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-6">
            {isLoadingConversation ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-gray-500">Loading conversation...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-lg font-medium text-gray-900 mb-2">AI Tutor</h3>
                <p className="text-gray-500">Ask me anything about your lesson!</p>
              </div>
            ) : null}
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                } animate-in slide-in-from-bottom-2 ease-out duration-300`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="max-w-[75%] sm:max-w-md">
                  <div
                    className={`px-4 py-3 shadow-sm transition-all duration-200 ${
                      message.role === "user"
                        ? "bg-[#007aff] text-white rounded-[20px] rounded-br-[8px]"
                        : "bg-[#f1f0f0] text-gray-900 rounded-[20px] rounded-bl-[8px]"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          a: ({ ...props}) => (
                            <a
                              {...props}
                              className="text-blue-600 underline hover:text-blue-800 font-semibold transition-colors"
                              target="_blank" // optional: open in new tab
                              rel="noopener noreferrer"
                            />
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    {message.role === "assistant" && onAddToNotes && (
                      <div className="mt-2 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAddToNotes(message.content)}
                          className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add to Notes
                        </Button>
                      </div>
                    )}
                  </div>
                  <p
                    className={`text-xs text-gray-400 mt-1 px-2 ${
                      message.role === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    {formatRelativeTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start animate-in slide-in-from-bottom-2 ease-out duration-300">
                <div className="max-w-[75%] sm:max-w-md">
                  <div className="bg-[#f1f0f0] text-gray-900 px-4 py-3 rounded-[20px] rounded-bl-[8px] shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.15s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.3s" }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500 ml-1">typing...</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 px-2">Just now</p>
                </div>
              </div>
            )}
          </div>

          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>
    </div>

    {/* Fixed Input Bar */}
    <div className="flex-shrink-0 backdrop-blur-sm bg-white/70 border-t border-gray-200/50">
      <div className="px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="min-h-[44px] max-h-[120px] resize-none border-gray-300 focus:border-[#007aff] focus:ring-[#007aff]/20 rounded-full px-4 py-3 shadow-sm transition-all duration-200 bg-white text-[15px] placeholder:text-gray-400"
                disabled={isTyping}
                rows={1}
              />
            </div>
            <Button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="h-11 w-11 rounded-full bg-[#007aff] hover:bg-[#0056d6] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 flex items-center justify-center"
            >
              <Send className="w-4 h-4 text-white" />
            </Button>
          </form>
        </div>
      </div>
    </div>
</div>
)
}