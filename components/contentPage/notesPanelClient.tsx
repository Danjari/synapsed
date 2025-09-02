"use client"

import { useState } from "react"
import "@blocknote/core/fonts/inter.css"
import { useCreateBlockNote } from "@blocknote/react"
import { BlockNoteView } from "@blocknote/mantine"
import "@blocknote/mantine/style.css"
import { useAnnotation } from "@/lib/contexts/annotation-context"
import { formatTimestamp } from "@/lib/utils/annotation-utils"
import { MessageSquare, Plus, FileText, Clock, Edit3, Trash2 } from "lucide-react"

interface NotesPanelProps {
  documentId: string | null
}

export function NotesPanelClient({ documentId }: NotesPanelProps) {
  // Ensure this component only runs on the client side
  if (typeof window === "undefined") {
    return <div className="h-full flex items-center justify-center">Loading...</div>
  }

  // Creates a new editor instance
  const editor = useCreateBlockNote()
  
  // Annotation context
  const { 
    currentDocument, 
    activeContentReference, 
    createNote, 
    updateNote,
    deleteNote,
    deleteContentReference,
    getNotesForContentReference,
    setActiveContentReference 
  } = useAnnotation()

  // State for note creation feedback
  const [noteCreationFeedback, setNoteCreationFeedback] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteContent, setEditingNoteContent] = useState<string>('')

  if (!documentId) {
    return (
      <div className="notes-panel h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No Document Selected</h3>
          <p className="text-muted-foreground">Select a document to view and add notes</p>
        </div>
      </div>
    )
  }

  return (
    <div className="notes-panel h-full flex flex-col bg-background rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <h2 className="text-lg font-semibold text-foreground">Notes</h2>
        </div>
      </div>

      {/* Content Reference Display */}
      {activeContentReference && (
        <div className="border-b border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Page {activeContentReference.pageNumber} - {activeContentReference.contentType}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  // TODO: Implement edit functionality for content reference
                  // For now, just show a message
                  alert('Edit functionality coming soon! You can edit the content preview and coordinates.')
                }}
                className="text-xs text-muted-foreground hover:text-blue-600 transition-colors p-1"
                title="Edit content reference"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this content reference and all its notes?')) {
                    const success = deleteContentReference(activeContentReference.id)
                    if (success) {
                      setNoteCreationFeedback('Content reference deleted successfully!')
                      setTimeout(() => setNoteCreationFeedback(null), 2000)
                    } else {
                      alert('Failed to delete content reference')
                    }
                  }
                }}
                className="text-xs text-muted-foreground hover:text-red-600 transition-colors p-1"
                title="Delete content reference"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => setActiveContentReference(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Close
              </button>
            </div>
          </div>
          
                      <div className="text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3 h-3" />
                {(() => {
                  try {
                    return formatTimestamp(activeContentReference.timestamp)
                  } catch (error) {
                    return 'Invalid date'
                  }
                })()}
              </div>
            <div className="bg-background p-2 rounded border text-xs">
              "{activeContentReference.contentPreview}"
            </div>
          </div>
          
          {/* Quick Note Creation */}
          <div className="space-y-3">
            {/* Feedback Message */}
            {noteCreationFeedback && (
              <div className="px-3 py-2 bg-green-100 border border-green-300 text-green-800 text-xs rounded-md animate-pulse">
                {noteCreationFeedback}
              </div>
            )}
            
                        <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a quick note..."
                className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const note = createNote({
                      contentReferenceId: activeContentReference.id,
                      content: e.currentTarget.value.trim()
                    })
                    if (note) {
                      setNoteCreationFeedback('Note created successfully!')
                      setTimeout(() => setNoteCreationFeedback(null), 2000)
                    }
                    e.currentTarget.value = ''
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input[placeholder="Add a quick note..."]') as HTMLInputElement
                  if (input && input.value.trim()) {
                    const note = createNote({
                      contentReferenceId: activeContentReference.id,
                      content: input.value.trim()
                    })
                    if (note) {
                      setNoteCreationFeedback('Note created successfully!')
                      setTimeout(() => setNoteCreationFeedback(null), 2000)
                    }
                    input.value = ''
                  }
                }}
                className="px-3 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      {activeContentReference && (
        <div className="border-b border-border bg-muted/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Notes</span>
          </div>
          
          {getNotesForContentReference(activeContentReference.id).length === 0 ? (
            <p className="text-xs text-muted-foreground">No notes yet. Add one above!</p>
          ) : (
            <div className="space-y-2">
              {getNotesForContentReference(activeContentReference.id).map((note) => (
                <div key={note.id} className="bg-background p-3 rounded border group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {editingNoteId === note.id ? (
                        <input
                          type="text"
                          value={editingNoteContent}
                          onChange={(e) => setEditingNoteContent(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-blue-300 rounded bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              console.log('Updating note via Enter:', { id: note.id, content: editingNoteContent })
                              const success = updateNote({
                                id: note.id,
                                content: editingNoteContent
                              })
                              console.log('Update result via Enter:', success)
                              if (success) {
                                setNoteCreationFeedback('Note updated successfully!')
                                setTimeout(() => setNoteCreationFeedback(null), 2000)
                                setEditingNoteId(null)
                                setEditingNoteContent('')
                              } else {
                                alert('Failed to update note')
                              }
                            }
                          }}
                        />
                      ) : (
                        <div className="text-sm text-foreground mb-1">{note.content}</div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {(() => {
                          try {
                            return formatTimestamp(note.timestamp)
                          } catch (error) {
                            return 'Invalid date'
                          }
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingNoteId === note.id ? (
                        <>
                          <button
                            onClick={() => {
                              console.log('Updating note:', { id: note.id, content: editingNoteContent })
                              const success = updateNote({
                                id: note.id,
                                content: editingNoteContent
                              })
                              console.log('Update result:', success)
                              if (success) {
                                setNoteCreationFeedback('Note updated successfully!')
                                setTimeout(() => setNoteCreationFeedback(null), 2000)
                                setEditingNoteId(null)
                                setEditingNoteContent('')
                              } else {
                                alert('Failed to update note')
                              }
                            }}
                            className="text-xs text-green-600 hover:text-green-700 transition-colors p-1"
                            title="Save changes"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => {
                              setEditingNoteId(null)
                              setEditingNoteContent('')
                            }}
                            className="text-xs text-gray-600 hover:text-gray-700 transition-colors p-1"
                            title="Cancel edit"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingNoteId(note.id)
                              setEditingNoteContent(note.content)
                            }}
                            className="text-xs text-muted-foreground hover:text-blue-600 transition-colors p-1"
                            title="Edit note"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this note?')) {
                                const success = deleteNote(note.id)
                                if (success) {
                                  setNoteCreationFeedback('Note deleted successfully!')
                                  setTimeout(() => setNoteCreationFeedback(null), 2000)
                                } else {
                                  alert('Failed to delete note')
                                }
                              }
                            }}
                            className="text-xs text-muted-foreground hover:text-red-600 transition-colors p-1"
                            title="Delete note"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BlockNote Editor */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full w-full">
          <BlockNoteView 
            editor={editor} 
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  )
}
