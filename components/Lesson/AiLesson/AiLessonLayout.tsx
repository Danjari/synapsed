"use client"

import type React from "react"
import { useState, useCallback, useRef } from "react"
import { ResizablePane } from "../contentPage/resizblePanel"
import ChatSection from "./ChatSection"
import Editor from "./Editor"
import { useLessonNote } from "@/lib/context/LessonNoteContext"

interface AiLessonLayoutProps {
  classId?: string
  lessonId?: string
  initialChatWidth?: number
}

export default function AiLessonLayout({ 
  classId, 
  lessonId, 
  initialChatWidth = 50 
}: AiLessonLayoutProps) {
  const [chatWidth, setChatWidth] = useState(initialChatWidth)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null)
  
  // Use lesson note context
  const { lessonNote, isLoading } = useLessonNote()

  const handleWidthChange = useCallback((width: number) => {
    setChatWidth(width)
  }, [])

  const handleAddToNotes = useCallback((content: string) => {
    if (editorRef.current) {
      const timestamp = new Date().toLocaleTimeString()
      const noteEntry = `\n\n--- ${timestamp} ---\n${content}\n`
      
      // Add the content directly to the editor
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editorRef.current.tryParseMarkdownToBlocks(noteEntry).then((blocks: any) => {
        const lastBlock = editorRef.current.document[editorRef.current.document.length - 1]
        editorRef.current.insertBlocks(blocks, lastBlock, "after")
      }).catch(() => {
        // If parsing fails, just add as a paragraph
        const newBlock = {
          type: "paragraph",
          content: noteEntry,
        }
        const lastBlock = editorRef.current.document[editorRef.current.document.length - 1]
        editorRef.current.insertBlocks([newBlock], lastBlock, "after")
      })
    }
  }, [])

  // Note: lesson note fetching is now handled by LessonNoteProvider

  const handleEditorContentChange = useCallback(() => {
    // This can be used for other purposes if needed
  }, [])

  return (
    <div className="h-full w-full bg-background overflow-hidden">
      <ResizablePane
        leftPane={
          <div className="h-full flex flex-col">
            {/* <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-muted/30">
              <h2 className="text-lg font-semibold text-foreground">AI Tutor</h2>
              <p className="text-sm text-muted-foreground">Ask questions and learn interactively</p>
            </div> */}
            <div className="flex-1 overflow-hidden">
              <ChatSection 
                onAddToNotes={handleAddToNotes}
                classId={classId}
                lessonId={lessonId}
              />
            </div>
          </div>
        }
        rightPane={
          <div className="h-full flex flex-col">
            {/* <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-muted/30">
              <h2 className="text-lg font-semibold text-foreground">Notes</h2>
              <p className="text-sm text-muted-foreground">Take notes as you learn</p>
            </div> */}
            <div className="flex-1 overflow-hidden p-4">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Loading notes...</p>
                  </div>
                </div>
              ) : (
                <Editor
                  ref={editorRef}
                  onContentChange={handleEditorContentChange}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  placeholder="Start taking notes here... The AI tutor can help you understand concepts and you can add important points to your notes."
                  className="h-full w-full"
                  classId={classId}
                  nodeId={lessonId}
                  showAICommands={true}
                  initialContent={Array.isArray(lessonNote?.content) ? lessonNote.content : undefined}
                />
              )}
            </div>
          </div>
        }
        initialWidth={chatWidth}
        onWidthChange={handleWidthChange}
        minWidth={25}
        maxWidth={75}
      />
    </div>
  )
}
