'use client';

import { FlashcardsPanel } from '@/components/Lesson/flashcard/FlashcardsPanel';

export default function TestFlashcardsPage() {
  // Use a proper 24-character ObjectID for testing
  const testNodeId = '507f1f77bcf86cd799439011';
  const testNodeTitle = 'Introduction to Operating Systems';
  const testMarkdownContent = `
# Introduction to Operating Systems

An operating system (OS) is system software that manages computer hardware, software resources, and provides common services for computer programs.

## Key Concepts

### 1. Process Management
The OS manages multiple processes, handling their creation, scheduling, and termination.

### 2. Memory Management
The OS allocates and deallocates memory space as needed by programs.

### 3. File System Management
The OS provides a way to store, retrieve, and manage files on storage devices.

### 4. Device Management
The OS controls and coordinates hardware devices and their drivers.

## Types of Operating Systems

- **Single-user, single-task**: Designed to manage the computer so that one user can effectively do one thing at a time.
- **Single-user, multi-tasking**: Allows a single user to run multiple applications simultaneously.
- **Multi-user**: Allows multiple users to access the computer system simultaneously.
- **Real-time**: Designed to process data as it comes in, typically within a time constraint.

## Examples

- Windows
- macOS
- Linux
- Android
- iOS
  `;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Flashcard Test Page</h1>
        <div className="bg-white rounded-lg shadow-lg h-[600px]">
          <FlashcardsPanel
            nodeId={testNodeId}
            nodeTitle={testNodeTitle}
            markdownContent={testMarkdownContent}
          />
        </div>
      </div>
    </div>
  );
} 