"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { DocumentSidebar } from "@/components/contentPage/documentSideBar"
import { ResizablePane } from "@/components/contentPage/resizblePanel"
import { Sidebar, SidebarClose as SidebarColumns, Moon, Sun } from "lucide-react"
import { AnnotationProvider } from "@/lib/content/annotation-context"

// Dynamic imports to prevent SSR issues
const PDFViewer = dynamic(() => import("@/components/contentPage/pdfViewer").then(mod => ({ default: mod.PDFViewer })), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center">Loading PDF viewer...</div>
})

const NotesPanelClient = dynamic(() => import("@/components/notes-panel-client").then(mod => ({ default: mod.NotesPanelClient })), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center">Loading notes panel...</div>
})

export default function PDFAnnotationApp() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null)
  const [paneWidth, setPaneWidth] = useState(50) // Percentage
  const [layoutMode, setLayoutMode] = useState<"sidebar" | "overlay">("sidebar")
  const [darkMode, setDarkMode] = useState(false)

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle("dark")
  }, [darkMode])

  return (
    <AnnotationProvider>
      <div className="h-screen flex bg-background">
      {/* Document Sidebar */}
      <DocumentSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        selectedDocument={selectedDocument}
        onDocumentSelect={setSelectedDocument}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between p-3 border-b border-border bg-card/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:scale-105 active:scale-95"
                title="Show document sidebar"
              >
                <Sidebar className="w-4 h-4" />
              </button>
            )}
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-foreground tracking-tight">Content Page</h1>
              <p className="text-xs text-muted-foreground">Select, annotate, and organize your documents</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:scale-105 active:scale-95"
              title={`Switch to ${darkMode ? "light" : "dark"} mode`}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setLayoutMode(layoutMode === "sidebar" ? "overlay" : "sidebar")}
              className={`
                p-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95
                ${
                  layoutMode === "sidebar"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "hover:bg-accent hover:text-accent-foreground"
                }
              `}
              title={`Switch to ${layoutMode === "sidebar" ? "overlay" : "sidebar"} mode`}
            >
              <SidebarColumns className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Panes */}
        <div className="flex-1">
          <ResizablePane
            leftPane={
              <div className="h-full p-4">
                <PDFViewer documentUrl={selectedDocument} />
              </div>
            }
            rightPane={
              <div className="h-full p-4">
                <NotesPanelClient documentId={selectedDocument} />
              </div>
            }
            initialWidth={paneWidth}
            onWidthChange={setPaneWidth}
            minWidth={25}
            maxWidth={75}
          />
        </div>
      </div>
      </div>
    </AnnotationProvider>
  )
}
