"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Question, AnswerOption } from './types';
import { RichTextEditor } from './RichTextEditor';
import { X, Plus, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface QuestionEditorProps {
  question: Question;
  onUpdateQuestion: (question: Question) => void;
}

export function QuestionEditor({
  question,
  onUpdateQuestion,
}: QuestionEditorProps) {
  const handleQuestionTextChange = (text: string) => {
    onUpdateQuestion({
      ...question,
      text,
    });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as Question['type'];
    let updatedOptions: AnswerOption[] = [...question.options];

    if (newType === 'true-false' && question.type !== 'true-false') {
      updatedOptions = [
        {
          id: `${question.id}-true`,
          text: 'True',
          isCorrect: false,
        },
        {
          id: `${question.id}-false`,
          text: 'False',
          isCorrect: false,
        },
      ];
    } else if (newType === 'short-answer') {
      updatedOptions = [];
    } else if (
      newType === 'multiple-choice' &&
      question.options.length === 0
    ) {
      updatedOptions = [
        {
          id: `${question.id}-1`,
          text: 'Option 1',
          isCorrect: false,
        },
        {
          id: `${question.id}-2`,
          text: 'Option 2',
          isCorrect: false,
        },
      ];
    }

    onUpdateQuestion({
      ...question,
      type: newType,
      options: updatedOptions,
    });
  };

  const handleOptionChange = (optionId: string, text: string) => {
    onUpdateQuestion({
      ...question,
      options: question.options.map((option) =>
        option.id === optionId
          ? {
              ...option,
              text,
            }
          : option,
      ),
    });
  };

  const handleCorrectOptionChange = (optionId: string) => {
    onUpdateQuestion({
      ...question,
      options: question.options.map((option) => ({
        ...option,
        isCorrect: option.id === optionId,
      })),
    });
  };

  const handleAddOption = () => {
    onUpdateQuestion({
      ...question,
      options: [
        ...question.options,
        {
          id: `${question.id}-${Date.now()}`,
          text: `Option ${question.options.length + 1}`,
          isCorrect: false,
        },
      ],
    });
  };

  const handleRemoveOption = (optionId: string) => {
    onUpdateQuestion({
      ...question,
      options: question.options.filter((option) => option.id !== optionId),
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdateQuestion({
          ...question,
          image: event.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    onUpdateQuestion({
      ...question,
      image: undefined,
    });
  };

  return (
    <Card className="h-full overflow-y-auto">
      <CardHeader>
        <CardTitle>Edit Question</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Question Type */}
        <div>
          <Label htmlFor="question-type" className="mb-2 block">
            Question Type
          </Label>
          <select
            id="question-type"
            value={question.type}
            onChange={handleTypeChange}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800"
          >
            <option value="multiple-choice">Multiple Choice</option>
            <option value="short-answer">Short Answer</option>
            <option value="true-false">True/False</option>
          </select>
        </div>

        {/* Question Text */}
        <div>
          <Label htmlFor="question-text" className="mb-2 block">
            Question Text <span className="text-red-500">*</span>
          </Label>
          <RichTextEditor
            value={question.text}
            onChange={handleQuestionTextChange}
          />
        </div>

        {/* Question Image */}
        <div>
          <Label className="mb-2 block">Question Image</Label>
          {question.image ? (
            <div className="relative border border-slate-300 dark:border-slate-600 rounded-md overflow-hidden">
              <Image
                src={question.image}
                alt="Question"
                width={800}
                height={256}
                className="max-h-64 mx-auto"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-md p-8 text-center">
              <div className="flex flex-col items-center">
                <ImageIcon className="h-12 w-12 text-slate-400" />
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Drag and drop an image, or
                </p>
                <label className="mt-2 cursor-pointer">
                  <span className="text-emerald-600 hover:text-emerald-500 text-sm font-medium">
                    Browse files
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Answer Options */}
        {question.type !== 'short-answer' && (
          <div>
            <Label className="mb-2 block">
              Answer Options <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-3">
              {question.options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center space-x-3 p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800"
                >
                  <input
                    type="radio"
                    checked={option.isCorrect}
                    onChange={() => handleCorrectOptionChange(option.id)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <Input
                    type="text"
                    value={option.text}
                    onChange={(e) =>
                      handleOptionChange(option.id, e.target.value)
                    }
                    className="flex-1"
                    placeholder="Enter option text"
                  />
                  {question.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(option.id)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
              {question.type === 'multiple-choice' && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="flex items-center text-emerald-600 hover:text-emerald-700 text-sm font-medium mt-2"
                >
                  <Plus size={16} className="mr-1" />
                  Add Option
                </button>
              )}
            </div>
          </div>
        )}

        {/* Short Answer Configuration */}
        {question.type === 'short-answer' && (
          <div>
            <Label className="mb-2 block">Short Answer Configuration</Label>
            <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Students will be asked to provide a written response to this
                question.
              </p>
              {question.hasError && (
                <div className="mt-3 flex items-start p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded border-l-4 border-red-500">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Validation Required</p>
                    <p className="mt-1">
                      Add sample answers or keywords for auto-grading.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

