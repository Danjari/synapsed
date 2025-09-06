/**
 * Core data structures for the content-aware note-taking system
 * These types define how PDF content is linked to student notes
 */

export interface Coordinates {
    x: number
    y: number
    width: number
    height: number
  }
  
  export interface ContentReference {
    id: string
    pageNumber: number
    contentType: 'text' | 'image' | 'diagram' | 'slide'
    contentHash: string // Hash of the content for reliable identification
    coordinates: Coordinates
    contentPreview: string // Brief preview of the referenced content
    timestamp: Date
    metadata: {
      documentId: string
      documentName: string
      createdBy: string
      lastModified: Date
    }
  }
  
  export interface Note {
    id: string
    contentReferenceId: string // Links to ContentReference
    content: string // The actual note text
    tags: string[] // For organization (e.g., "important", "question", "definition")
    color?: string // Optional color coding
    timestamp: Date
    lastModified: Date
    createdBy: string
  }
  
  export interface DocumentAnnotation {
    documentId: string
    documentName: string
    contentReferences: ContentReference[]
    notes: Note[]
    metadata: {
      createdAt: Date
      lastModified: Date
      totalNotes: number
      pagesWithNotes: number[]
    }
  }
  
  export interface AnnotationState {
    currentDocument: DocumentAnnotation | null
    activeContentReference: ContentReference | null
    activeNote: Note | null
    isEditing: boolean
  }
  
  // Utility types for API responses and operations
  export type CreateContentReferenceRequest = Omit<ContentReference, 'id' | 'timestamp' | 'metadata'> & {
    documentId: string
    documentName: string
  }
  export type CreateNoteRequest = Omit<Note, 'id' | 'timestamp' | 'metadata'> & {
    tags?: string[]
    color?: string
  }
  export type UpdateNoteRequest = Partial<Omit<Note, 'id' | 'timestamp' | 'metadata'>> & { id: string }
  
  // Validation types
  export interface ValidationResult {
    isValid: boolean
    errors: string[]
  }
  
  // Search and filter types
  export interface NoteSearchQuery {
    text?: string
    tags?: string[]
    dateRange?: {
      start: Date
      end: Date
    }
    pageNumbers?: number[]
    contentType?: ContentReference['contentType']
  }
  
  export interface NoteSearchResult {
    notes: Note[]
    contentReferences: ContentReference[]
    totalResults: number
    pageInfo: {
      currentPage: number
      totalPages: number
      resultsPerPage: number
    }
  }
  