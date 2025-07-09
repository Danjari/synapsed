"use client";

import { useEffect, useState } from "react";
import { File, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function ContentView({ classId }: { classId: string }) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [ setFileToRename] = useState<any | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<any | null>(null);

  useEffect(() => {
    const fetchMaterials = async () => {
      const res = await fetch(`/api/class/${classId}/materials`);
      const data = await res.json();
      setMaterials(data);
    };
    fetchMaterials();
  }, [classId]);

  const filteredFiles = materials.filter((file) =>
    file.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRenameFile = () => {
    toast(
      "Rename not implemented",
      {description: "You can implement rename logic here.",}
    );
    setIsRenameDialogOpen(false);
  };

  const handleDeleteFile = () => {
    toast(
      "Delete not implemented",{
        description: "You can implement delete logic here.",
      }
     );
    setIsDeleteDialogOpen(false);
  };

  const getFileTypeBadge = (type: string, isVectorized: boolean) => {
    return (
      <Badge variant={isVectorized ? "default" : "secondary"}>
        {type.toUpperCase()} {isVectorized ? "✅" : "⏳"}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Content Management</h2>
        <p className="text-muted-foreground">Manage your uploaded class materials.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Files</CardTitle>
          <CardDescription>Review and manage your uploaded materials.</CardDescription>
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
                  <TableHead className="hidden md:table-cell">Upload Date</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline">
                        <File className="h-4 w-4" />
                        {file.title}
                      </a>
                    </TableCell>
                    <TableCell>{getFileTypeBadge(file.type, file.isVectorized)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {new Date(file.uploadedAt).toLocaleDateString()}
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
                              setFileToRename(file);
                              setNewFileName(file.title);
                              setIsRenameDialogOpen(true);
                            }}
                          >
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setFileToDelete(file);
                              setIsDeleteDialogOpen(true);
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
              Are you sure you want to delete {fileToDelete?.title}? This action cannot be undone.
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
  );
}
