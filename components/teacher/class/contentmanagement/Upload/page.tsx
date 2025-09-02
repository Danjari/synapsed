"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function UploadSection({ classId, onUploadComplete }: { classId: string; onUploadComplete: () => void }) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append("classId", classId);
    selectedFiles.forEach((file) => formData.append("files", file));

    try {
      const res = await fetch("/api/classMaterial/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        onUploadComplete(); // callback to refresh list in parent
        setSelectedFiles([]);
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="hover:shadow-none hover:translate-y-0">
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
            <Button
              size="sm"
              onClick={() => document.getElementById("fileInput")?.click()}
              disabled={isUploading}
            >
              Select Files
            </Button>
            <input
              id="fileInput"
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.docx,.mp4"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-4 w-full space-y-2">
            <h4 className="text-sm font-medium">Selected Files:</h4>
            <ul className="list-disc pl-5 text-sm">
              {selectedFiles.map((file) => (
                <li key={file.name}>{file.name}</li>
              ))}
            </ul>
            <Button onClick={handleUpload} disabled={isUploading} className="mt-2 w-full">
              {isUploading ? "Uploading..." : `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""}`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
