"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, ArrowUp, Settings2, Mic, X, Check } from 'lucide-react'
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
  const [hasTriggeredIntroduction, setHasTriggeredIntroduction] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  // Fetcher function for SWR
  const fetcher = async (url: string) => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Failed to load conversation')
    }
    return response.json()
  }

  // Use SWR for fast, cached conversation loading
  const conversationKey = userId && classId && lessonId 
    ? `/api/conversations/by-lesson?userId=${userId}&classId=${classId}&lessonId=${lessonId}`
    : null
  
  const { data, error, isLoading: isLoadingConversation } = useSWR(
    conversationKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000, // Dedupe requests within 2 seconds
    }
  )

  // Log errors (but continue gracefully)
  useEffect(() => {
    if (error) {
      console.error('Error loading conversation:', error)
    }
  }, [error])

  // Determine if we have an existing conversation
  const hasExistingConversation = data?.conversation !== null && data?.conversation !== undefined
  // Removed isChatMode since we're always in chat mode
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesRef = useRef<Message[]>([])
  
  // Keep ref in sync with messages state
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Load conversation data when SWR fetches it
  useEffect(() => {
    if (data) {
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
      } else {
        // No conversation found - clear messages
        setMessages([])
        setThreadId(null)
      }
    }
  }, [data])

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

  // Auto-trigger Socratic introduction when it's truly the first time (no conversation in DB)
  useEffect(() => {
    // Only trigger if:
    // 1. Conversation loading is complete
    // 2. No existing conversation was found in the DB
    // 3. No messages in state (as a double-check)
    // 4. Haven't triggered introduction yet
    // 5. All required parameters are present
    if (
      !isLoadingConversation &&
      !hasExistingConversation &&
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
  }, [isLoadingConversation, hasExistingConversation, messages.length, hasTriggeredIntroduction, nodeTitle, userId, classId, lessonId, studentName, sendSystemMessage])

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

  const handleMicClick = () => {
    setIsRecording(true)
    setTimeout(() => {
      setIsRecording(false)
      setInput("When speech to text feature ?")
    }, 5000)
  }

  const handleCancelRecording = () => {
    setIsRecording(false)
  }

  const handleConfirmRecording = () => {
    setIsRecording(false)
    setInput("When speech to text feature ?")
  }

  const WaveAnimation = () => {
    const [animationKey, setAnimationKey] = useState(0)
    useEffect(() => {
      const interval = setInterval(() => {
        setAnimationKey((prev) => prev + 1)
      }, 100)
      return () => clearInterval(interval)
    }, [])

    const bars = Array.from({ length: 50 }, (_, i) => {
      const height = Math.random() * 20 + 4
      const delay = Math.random() * 2
      return (
        <div
          key={`${i}-${animationKey}`}
          className="bg-gray-400 rounded-sm animate-pulse"
          style={{
            width: "2px",
            height: `${height}px`,
            animationDelay: `${delay}s`,
            animationDuration: "1s",
          }}
        />
      )
    })

    return (
      <div className="flex items-center w-full gap-1">
        <div className="flex-1 border-t-2 border-dotted border-gray-400"></div>
        <div className="flex items-center gap-0.5 justify-center px-8">{bars}</div>
        <div className="flex-1 border-t-2 border-dotted border-gray-400"></div>
      </div>
    )
  }

  return (<div className="h-full bg-white flex flex-col font-system overflow-hidden">
    <style dangerouslySetInnerHTML={{ __html: mathStyles }} />
    {/* Chat Messages */}
    <div className="flex-1 overflow-hidden">
      <div className="h-full overflow-y-auto px-4 py-6 relative">
        {/* Gradient fade overlay at bottom */}
        <div className="sticky bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10"></div>
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
                } animate-in fade-in slide-in-from-bottom-2 ease-out duration-500`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className={message.role === "user" ? "max-w-[75%] sm:max-w-md" : "w-full"}>
                  <div
                    className={`px-4 py-3 transition-all duration-300 ease-out ${
                      message.role === "user"
                        ? "bg-gray-100 text-gray-900 rounded-[20px] rounded-br-[8px]"
                        : "bg-transparent text-gray-900 rounded-[20px] rounded-bl-[8px]"
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
                              className="text-blue-600 underline hover:text-blue-800 font-semibold transition-colors duration-200"
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    {message.role === "assistant" && onAddToNotes && (
                      <div className="mt-3 flex justify-end animate-in fade-in duration-300">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onAddToNotes(message.content)}
                                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-gray-900 text-white text-xs">
                              <p>Add to Notes</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 ease-out duration-500">
                <div className="w-full">
                  <div className="bg-transparent text-gray-900 px-4 py-3 rounded-[20px] rounded-bl-[8px]">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce transition-all duration-300"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce transition-all duration-300"
                          style={{ animationDelay: "0.15s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce transition-all duration-300"
                          style={{ animationDelay: "0.3s" }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500 ml-1 animate-pulse">typing...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>
    </div>

    {/* Fixed Input Bar */}
    <div className="flex-shrink-0 backdrop-blur-md bg-white/80 relative z-20">
      <div className="px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <form onSubmit={handleSubmit} className="relative">
              <div
                className="border border-gray-300 rounded-2xl p-4 relative transition-all duration-500 ease-in-out overflow-hidden bg-white/95 backdrop-blur-sm shadow-sm"
              >
                {isRecording ? (
                  <div className="flex items-center justify-between h-12 animate-in fade-in-0 slide-in-from-top-2 duration-500 w-full">
                    <WaveAnimation />
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelRecording}
                        className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleConfirmRecording}
                        className="h-8 w-8 p-0 rounded-lg transition-all duration-200 hover:scale-110 bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        <Check className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      className="w-full bg-transparent text-gray-900 placeholder-gray-400 resize-none border-none outline-none text-base leading-relaxed min-h-[24px] max-h-32 transition-all duration-200"
                      rows={1}
                      disabled={isTyping}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = "auto"
                        target.style.height = target.scrollHeight + "px"
                      }}
                    />
                    <div className="flex items-center justify-between mt-8">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110"
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110"
                        >
                          <Settings2 className="h-5 w-5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleMicClick}
                          disabled={isTyping}
                          className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Mic className="h-5 w-5 transition-transform duration-200" />
                        </Button>
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!input.trim() || isTyping}
                        className="h-8 w-8 p-0 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 rounded-lg transition-all duration-200 hover:scale-110 disabled:hover:scale-100"
                      >
                        <ArrowUp className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
</div>
)
}