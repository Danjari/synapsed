"use client"

import { useState } from "react"
import { File, MoreHorizontal, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

// Sample content data
const contentFiles = [
  { id: 1, name: "Quantum Mechanics Intro.pdf", type: "pdf", size: "2.4 MB", uploadDate: "2023-09-01" },
  { id: 2, name: "Relativity Theory.docx", type: "docx", size: "1.8 MB", uploadDate: "2023-09-02" },
  { id: 3, name: "Wave Particle Duality.mp4", type: "video", size: "45.6 MB", uploadDate: "2023-09-03" },
  { id: 4, name: "Problem Set 1.pdf", type: "pdf", size: "1.2 MB", uploadDate: "2023-09-05" },
  { id: 5, name: "Lecture Notes Week 1.pdf", type: "pdf", size: "3.5 MB", uploadDate: "2023-09-10" },
]

export function ContentManagement() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [fileToRename, setFileToRename] = useState<(typeof contentFiles)[0] | null>(null)
  const [newFileName, setNewFileName] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<(typeof contentFiles)[0] | null>(null)

  const filteredFiles = contentFiles.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleRenameFile = () => {
    // In a real app, this would call an API to rename the file
    toast("File renamed",{
      description: `File has been renamed to ${newFileName}.`,
    })
    setIsRenameDialogOpen(false)
  }

  const handleDeleteFile = () => {
    // In a real app, this would call an API to delete the file
    toast("File deleted",{
      description: `${fileToDelete?.name} has been deleted.`,
    })
    setIsDeleteDialogOpen(false)
  }

  const getFileIcon = (type: string) => {
    return <File className="h-4 w-4" />
  }

  const getFileTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      pdf: "default",
      docx: "secondary",
      video: "outline",
    }

    return <Badge variant={variants[type] || "default"}>{type.toUpperCase()}</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Content Management</h2>
        <p className="text-muted-foreground">Upload and manage your class materials.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Upload Content</CardTitle>
            <CardDescription>Upload PDFs, DOCXs, and videos for your students.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
            <div className="flex flex-col items-center justify-center space-y-2 text-center">
              <div className="rounded-full bg-muted p-3">
                <Upload className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Drag files here or click to upload</p>
                <p className="text-xs text-muted-foreground">Supports PDF, DOCX, MP4, and other common formats</p>
              </div>
              <Button size="sm">Select Files</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Content Files</CardTitle>
            <CardDescription>Manage your uploaded content files.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden md:table-cell">Size</TableHead>
                  <TableHead className="hidden md:table-cell">Upload Date</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.type)}
                        <span>{file.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getFileTypeBadge(file.type)}</TableCell>
                    <TableCell className="hidden md:table-cell">{file.size}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {new Date(file.uploadDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setFileToRename(file)
                              setNewFileName(file.name)
                              setIsRenameDialogOpen(true)
                            }}
                          >
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem>Replace</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setFileToDelete(file)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>Enter a new name for the file.</DialogDescription>
          </DialogHeader>
          <Input value={newFileName} onChange={(e) => setNewFileName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameFile}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {fileToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFile}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
