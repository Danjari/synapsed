"use client"

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import { 
  AnnotationState, 
  ContentReference, 
  Note, 
  DocumentAnnotation,
  CreateContentReferenceRequest,
  CreateNoteRequest,
  UpdateNoteRequest
} from '../types/annotations'
import { contentReferenceService } from '../services/content-reference-service'

// Action types for the reducer
type AnnotationAction =
  | { type: 'SET_CURRENT_DOCUMENT'; payload: DocumentAnnotation | null }
  | { type: 'SET_ACTIVE_CONTENT_REFERENCE'; payload: ContentReference | null }
  | { type: 'SET_ACTIVE_NOTE'; payload: Note | null }
  | { type: 'SET_EDITING'; payload: boolean }
  | { type: 'ADD_CONTENT_REFERENCE'; payload: ContentReference }
  | { type: 'UPDATE_CONTENT_REFERENCE'; payload: ContentReference }
  | { type: 'DELETE_CONTENT_REFERENCE'; payload: string }
  | { type: 'ADD_NOTE'; payload: Note }
  | { type: 'UPDATE_NOTE'; payload: Note }
  | { type: 'DELETE_NOTE'; payload: string }
  | { type: 'LOAD_DOCUMENT_ANNOTATIONS'; payload: DocumentAnnotation }

// Initial state
const initialState: AnnotationState = {
  currentDocument: null,
  activeContentReference: null,
  activeNote: null,
  isEditing: false
}

// Reducer function
function annotationReducer(state: AnnotationState, action: AnnotationAction): AnnotationState {
  switch (action.type) {
    case 'SET_CURRENT_DOCUMENT':
      return {
        ...state,
        currentDocument: action.payload,
        activeContentReference: null,
        activeNote: null,
        isEditing: false
      }
    
    case 'SET_ACTIVE_CONTENT_REFERENCE':
      return {
        ...state,
        activeContentReference: action.payload,
        activeNote: action.payload ? state.activeNote : null
      }
    
    case 'SET_ACTIVE_NOTE':
      return {
        ...state,
        activeNote: action.payload
      }
    
    case 'SET_EDITING':
      return {
        ...state,
        isEditing: action.payload
      }
    
    case 'ADD_CONTENT_REFERENCE':
      if (!state.currentDocument) return state
      
      return {
        ...state,
        currentDocument: {
          ...state.currentDocument,
          contentReferences: [...state.currentDocument.contentReferences, action.payload],
          metadata: {
            ...state.currentDocument.metadata,
            lastModified: new Date(),
            pagesWithNotes: contentReferenceService.getPagesWithNotes([
              ...state.currentDocument.contentReferences,
              action.payload
            ])
          }
        }
      }
    
    case 'UPDATE_CONTENT_REFERENCE':
      if (!state.currentDocument) return state
      
      return {
        ...state,
        currentDocument: {
          ...state.currentDocument,
          contentReferences: state.currentDocument.contentReferences.map(ref => 
            ref.id === action.payload.id ? action.payload : ref
          ),
          metadata: {
            ...state.currentDocument.metadata,
            lastModified: new Date()
          }
        }
      }
    
    case 'DELETE_CONTENT_REFERENCE':
      if (!state.currentDocument) return state
      
      return {
        ...state,
        currentDocument: {
          ...state.currentDocument,
          contentReferences: state.currentDocument.contentReferences.filter(ref => ref.id !== action.payload),
          notes: state.currentDocument.notes.filter(note => note.contentReferenceId !== action.payload),
          metadata: {
            ...state.currentDocument.metadata,
            lastModified: new Date(),
            totalNotes: state.currentDocument.notes.filter(note => note.contentReferenceId !== action.payload).length,
            pagesWithNotes: contentReferenceService.getPagesWithNotes(
              state.currentDocument.contentReferences.filter(ref => ref.id !== action.payload)
            )
          }
        }
      }
    
    case 'ADD_NOTE':
      if (!state.currentDocument) return state
      
      return {
        ...state,
        currentDocument: {
          ...state.currentDocument,
          notes: [...state.currentDocument.notes, action.payload],
          metadata: {
            ...state.currentDocument.metadata,
            lastModified: new Date(),
            totalNotes: state.currentDocument.notes.length + 1
          }
        }
      }
    
    case 'UPDATE_NOTE':
      if (!state.currentDocument) return state
      
      return {
        ...state,
        currentDocument: {
          ...state.currentDocument,
          notes: state.currentDocument.notes.map(note => 
            note.id === action.payload.id ? action.payload : note
          ),
          metadata: {
            ...state.currentDocument.metadata,
            lastModified: new Date()
          }
        }
      }
    
    case 'DELETE_NOTE':
      if (!state.currentDocument) return state
      
      return {
        ...state,
        currentDocument: {
          ...state.currentDocument,
          notes: state.currentDocument.notes.filter(note => note.id !== action.payload),
          metadata: {
            ...state.currentDocument.metadata,
            lastModified: new Date(),
            totalNotes: state.currentDocument.notes.length - 1
          }
        }
      }
    
    case 'LOAD_DOCUMENT_ANNOTATIONS':
      return {
        ...state,
        currentDocument: action.payload,
        activeContentReference: null,
        activeNote: null,
        isEditing: false
      }
    
    default:
      return state
  }
}

// Context interface
interface AnnotationContextType extends AnnotationState {
  // Document management
  loadDocumentAnnotations: (documentId: string) => void
  clearDocumentAnnotations: (documentId: string) => void
  
  // Content reference management
  createContentReference: (request: CreateContentReferenceRequest) => ContentReference | null
  setActiveContentReference: (reference: ContentReference | null) => void
  updateContentReference: (id: string, updates: Partial<ContentReference>) => ContentReference | null
  deleteContentReference: (id: string) => boolean
  
  // Note management
  createNote: (request: CreateNoteRequest) => Note | null
  updateNote: (request: UpdateNoteRequest) => Note | null
  deleteNote: (noteId: string) => boolean
  setActiveNote: (note: Note | null) => void
  
  // UI state
  setEditing: (editing: boolean) => void
  
  // Utility methods
  getNotesForContentReference: (contentReferenceId: string) => Note[]
  getPagesWithNotes: () => number[]
}

// Create the context
const AnnotationContext = createContext<AnnotationContextType | undefined>(undefined)

// Provider component
interface AnnotationProviderProps {
  children: ReactNode
}

export function AnnotationProvider({ children }: AnnotationProviderProps) {
  const [state, dispatch] = useReducer(annotationReducer, initialState)

  // Load document annotations from storage
  const loadDocumentAnnotations = useCallback((documentId: string) => {
    const annotations = contentReferenceService.getDocumentAnnotations(documentId)
    if (annotations) {
      dispatch({ type: 'LOAD_DOCUMENT_ANNOTATIONS', payload: annotations })
    } else {
      dispatch({ type: 'SET_CURRENT_DOCUMENT', payload: null })
    }
  }, [])

  // Clear document annotations
  const clearDocumentAnnotations = useCallback((documentId: string) => {
    const success = contentReferenceService.clearDocumentAnnotations(documentId)
    if (success) {
      dispatch({ type: 'SET_CURRENT_DOCUMENT', payload: null })
    }
  }, [])

  // Create content reference
  const createContentReference = useCallback((request: CreateContentReferenceRequest): ContentReference | null => {
    const reference = contentReferenceService.createContentReference(request)
    if (reference) {
      dispatch({ type: 'ADD_CONTENT_REFERENCE', payload: reference })
      return reference
    }
    return null
  }, [])

  // Set active content reference
  const setActiveContentReference = useCallback((reference: ContentReference | null) => {
    dispatch({ type: 'SET_ACTIVE_CONTENT_REFERENCE', payload: reference })
  }, [])

  // Create note
  const createNote = useCallback((request: CreateNoteRequest): Note | null => {
    const note = contentReferenceService.createNote(request)
    if (note) {
      dispatch({ type: 'ADD_NOTE', payload: note })
      return note
    }
    return null
  }, [])

  // Update note
  const updateNote = useCallback((request: UpdateNoteRequest): Note | null => {
    const note = contentReferenceService.updateNote(request)
    if (note) {
      dispatch({ type: 'UPDATE_NOTE', payload: note })
      return note
    }
    return null
  }, [])

  // Delete note
  const deleteNote = useCallback((noteId: string): boolean => {
    const success = contentReferenceService.deleteNote(noteId)
    if (success) {
      dispatch({ type: 'DELETE_NOTE', payload: noteId })
      return true
    }
    return false
  }, [])

  // Update content reference
  const updateContentReference = useCallback((id: string, updates: Partial<ContentReference>): ContentReference | null => {
    const reference = contentReferenceService.updateContentReference(id, updates)
    if (reference) {
      dispatch({ type: 'UPDATE_CONTENT_REFERENCE', payload: reference })
      return reference
    }
    return null
  }, [])

  // Delete content reference
  const deleteContentReference = useCallback((id: string): boolean => {
    const success = contentReferenceService.deleteContentReference(id)
    if (success) {
      dispatch({ type: 'DELETE_CONTENT_REFERENCE', payload: id })
      // If the deleted reference was active, clear the active reference
      if (state.activeContentReference?.id === id) {
        dispatch({ type: 'SET_ACTIVE_CONTENT_REFERENCE', payload: null })
      }
      return true
    }
    return false
  }, [state.activeContentReference])

  // Set active note
  const setActiveNote = useCallback((note: Note | null) => {
    dispatch({ type: 'SET_ACTIVE_NOTE', payload: note })
  }, [])

  // Set editing state
  const setEditing = useCallback((editing: boolean) => {
    dispatch({ type: 'SET_EDITING', payload: editing })
  }, [])

  // Get notes for content reference
  const getNotesForContentReference = useCallback((contentReferenceId: string): Note[] => {
    return contentReferenceService.getNotesForContentReference(contentReferenceId)
  }, [])

  // Get pages with notes
  const getPagesWithNotes = useCallback((): number[] => {
    if (!state.currentDocument) return []
    return state.currentDocument.metadata.pagesWithNotes
  }, [state.currentDocument])

  // Context value
  const contextValue: AnnotationContextType = {
    ...state,
    loadDocumentAnnotations,
    clearDocumentAnnotations,
    createContentReference,
    setActiveContentReference,
    updateContentReference,
    deleteContentReference,
    createNote,
    updateNote,
    deleteNote,
    setActiveNote,
    setEditing,
    getNotesForContentReference,
    getPagesWithNotes
  }

  return (
    <AnnotationContext.Provider value={contextValue}>
      {children}
    </AnnotationContext.Provider>
  )
}

// Custom hook to use the annotation context
export function useAnnotation() {
  const context = useContext(AnnotationContext)
  if (context === undefined) {
    throw new Error('useAnnotation must be used within an AnnotationProvider')
  }
  return context
}
