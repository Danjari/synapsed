"use client"

import type React from "react"
import { useState, useCallback, useRef } from "react"
import { ResizablePane } from "../contentPage/resizblePanel"
import ChatSection from "./ChatSection"
import Editor from "./Editor"

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

  const handleEditorContentChange = useCallback(() => {
    // This can be used for other purposes if needed
  }, [])

  return (
    <div className="h-screen w-full bg-background overflow-hidden">
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
              <Editor
                ref={editorRef}
                onContentChange={handleEditorContentChange}
                onFocus={() => {}}
                onBlur={() => {}}
                placeholder="Start taking notes here... The AI tutor can help you understand concepts and you can add important points to your notes."
                className="h-full w-full"
              />
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
