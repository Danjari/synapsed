"use client";

import { useState } from "react";
import { Upload, BookOpen, GraduationCap, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UploadSection({ classId, onUploadComplete }: { classId: string; onUploadComplete: () => void }) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showCategorySelection, setShowCategorySelection] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
      setShowCategorySelection(true);
    }
  };

  const handleUpload = async (category: string) => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append("classId", classId);
    formData.append("category", category);
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
        setShowCategorySelection(false);
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDirectUpload = (category: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.docx,.mp4';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        setSelectedFiles(Array.from(files));
        handleUpload(category);
      }
    };
    input.click();
  };

  return (
    <Card className="hover:shadow-none hover:translate-y-0">
      <CardHeader>
        <CardTitle>Upload Content</CardTitle>
        <p className="text-sm text-muted-foreground">Choose the type of content you want to upload</p>
      </CardHeader>
      <CardContent>
        {!showCategorySelection ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Class Content Upload */}
            <div className="flex flex-col items-center p-6 border-2 border-dashed border-blue-200 rounded-lg hover:border-blue-400 transition-colors">
              <div className="rounded-full bg-blue-100 p-3 mb-3">
                <GraduationCap className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-medium text-sm mb-2">Class Content</h3>
              <p className="text-xs text-muted-foreground text-center mb-4">
                Lectures, slides, course materials
                <br />
                <span className="text-green-600 font-medium">✓ Vectorization Enabled</span>
              </p>
              <Button 
                onClick={() => handleDirectUpload("CONTENT")} 
                disabled={isUploading}
                className="w-full"
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Content
              </Button>
            </div>

            {/* Syllabus Upload */}
            <div className="flex flex-col items-center p-6 border-2 border-dashed border-green-200 rounded-lg hover:border-green-400 transition-colors">
              <div className="rounded-full bg-green-100 p-3 mb-3">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-medium text-sm mb-2">Syllabus & Course Info</h3>
              <p className="text-xs text-muted-foreground text-center mb-4">
                Course outlines, calendars, rubrics
                <br />
                <span className="text-gray-500">No Vectorization</span>
              </p>
              <Button 
                onClick={() => handleDirectUpload("SYLLABUS")} 
                disabled={isUploading}
                className="w-full"
                size="sm"
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Syllabus
              </Button>
            </div>

            {/* Exercises Upload */}
            <div className="flex flex-col items-center p-6 border-2 border-dashed border-orange-200 rounded-lg hover:border-orange-400 transition-colors">
              <div className="rounded-full bg-orange-100 p-3 mb-3">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="font-medium text-sm mb-2">Exercises & Papers</h3>
              <p className="text-xs text-muted-foreground text-center mb-4">
                Assignments, homework, practice problems
                <br />
                <span className="text-gray-500">No Vectorization</span>
              </p>
              <Button 
                onClick={() => handleDirectUpload("EXERCISES")} 
                disabled={isUploading}
                className="w-full"
                size="sm"
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Exercises
              </Button>
            </div>
          </div>
        ) : (
          /* Category Selection for Drag & Drop */
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-medium mb-2">Choose category for {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {selectedFiles.map(file => file.name).join(', ')}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button 
                onClick={() => handleUpload("CONTENT")} 
                disabled={isUploading}
                className="flex items-center gap-2"
              >
                <GraduationCap className="h-4 w-4" />
                Class Content
              </Button>
              <Button 
                onClick={() => handleUpload("SYLLABUS")} 
                disabled={isUploading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Syllabus
              </Button>
              <Button 
                onClick={() => handleUpload("EXERCISES")} 
                disabled={isUploading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Exercises
              </Button>
            </div>
            
            <Button 
              onClick={() => {
                setSelectedFiles([]);
                setShowCategorySelection(false);
              }}
              variant="ghost"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Hidden file input for drag & drop */}
        <input
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.docx,.mp4"
          onChange={handleFileChange}
        />
      </CardContent>
    </Card>
  );
}
