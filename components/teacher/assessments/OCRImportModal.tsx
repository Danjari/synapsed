"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Question } from './types';
import { OCRResponse } from '@/lib/types/quizzes';
import { X, Upload, FileText, AlertCircle, Check } from 'lucide-react';

interface OCRImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (questions: Question[]) => void;
}

export function OCRImportModal({
  open,
  onClose,
  onImport,
}: OCRImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [processedQuestions, setProcessedQuestions] = useState<Question[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (
      droppedFile &&
      (droppedFile.type === 'application/pdf' ||
        droppedFile.type.startsWith('image/'))
    ) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please upload a PDF or image file.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (
      selectedFile &&
      (selectedFile.type === 'application/pdf' ||
        selectedFile.type.startsWith('image/'))
    ) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please upload a PDF or image file.');
    }
  };

  const handleProcessFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProcessProgress(0);
    setError(null);

    try {
      // Update progress: uploading
      setProcessProgress(20);

      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Update progress: processing OCR
      setProcessProgress(40);

      // Call OCR API
      const response = await fetch('/api/professor/quizzes/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process file');
      }

      // Update progress: parsing questions
      setProcessProgress(80);

      const data = await response.json();

      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error('Invalid response format');
      }

      // Update progress: complete
      setProcessProgress(100);

      // Transform to Question format
      const responseData = data as OCRResponse;
      const transformedQuestions: Question[] = responseData.questions.map((q) => ({
        id: q.id || `ocr-${Date.now()}-${Math.random()}`,
        text: q.text || '',
        type: (q.type || 'multiple-choice') as 'multiple-choice' | 'short-answer' | 'true-false',
        options: (q.options || []).map((opt, index: number) => ({
          id: opt.id || `ocr-opt-${Date.now()}-${index}`,
          text: opt.text || '',
          isCorrect: opt.isCorrect || false,
        })),
        order: q.order || 0,
      }));

      setProcessedQuestions(transformedQuestions);
      setIsProcessing(false);
    } catch (err) {
      console.error('Error processing OCR:', err);
      setError(err instanceof Error ? err.message : 'Failed to process file');
      setIsProcessing(false);
      setProcessProgress(0);
    }
  };

  const handleImport = () => {
    onImport(processedQuestions);
    // Reset state
    setFile(null);
    setProcessedQuestions([]);
    setProcessProgress(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Questions via OCR</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {!processedQuestions.length && !isProcessing && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                  <Upload className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-medium">Upload a File</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
                  Drag and drop a PDF or image file, or click to browse. We
                  will extract questions and answers automatically.
                </p>
                <div className="mt-4">
                  <label className="cursor-pointer">
                    <span className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 inline-block">
                      Select File
                    </span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                {file && (
                  <div className="mt-4 flex items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-md">
                    <FileText className="h-5 w-5 text-slate-500 dark:text-slate-400 mr-2" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="ml-2 text-slate-400 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                {error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-md flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="text-center py-8">
              <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-medium mb-2">Processing Your File</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                This may take a moment. We are extracting questions and
                answers...
              </p>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-4">
                <div
                  className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${processProgress}%`,
                  }}
                ></div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {processProgress < 50
                  ? 'Analyzing document structure...'
                  : 'Extracting question content...'}
              </p>
            </div>
          )}

          {processedQuestions.length > 0 && !isProcessing && (
            <div>
              <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500 rounded-md">
                <div className="flex">
                  <Check className="h-5 w-5 text-emerald-500 mr-2" />
                  <div>
                    <h3 className="font-medium text-emerald-800 dark:text-emerald-300">
                      Successfully extracted {processedQuestions.length}{' '}
                      questions
                    </h3>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                      Review and edit the extracted questions below before
                      importing.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {processedQuestions.map((question) => (
                  <div
                    key={question.id}
                    className="p-4 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800"
                  >
                    <div className="mb-2 flex justify-between">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                        {question.type === 'multiple-choice'
                          ? 'Multiple Choice'
                          : 'Short Answer'}
                      </span>
                    </div>
                    <p className="font-medium mb-3">{question.text}</p>
                    {question.type === 'multiple-choice' && (
                      <div className="ml-4 space-y-1">
                        {question.options.map((option) => (
                          <div key={option.id} className="flex items-center">
                            <div
                              className={`h-4 w-4 rounded-full mr-2 ${
                                option.isCorrect
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-300 dark:bg-slate-600'
                              }`}
                            ></div>
                            <span
                              className={
                                option.isCorrect ? 'font-medium' : ''
                              }
                            >
                              {option.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {!processedQuestions.length && !isProcessing && file && (
            <Button onClick={handleProcessFile}>Process File</Button>
          )}
          {processedQuestions.length > 0 && !isProcessing && (
            <Button onClick={handleImport}>Import Questions</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

