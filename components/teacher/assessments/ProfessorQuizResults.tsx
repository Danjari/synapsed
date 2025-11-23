"use client";

import { Card, CardContent } from "@/components/ui/card";

interface ProfessorQuizResultsProps {
  classId: string;
}

export function ProfessorQuizResults({ classId }: ProfessorQuizResultsProps) {
  // TODO: Implement professor-led quiz results
  // This will show results from quizzes created via QuizBuilder
  
  return (
    <Card>
      <CardContent className="py-8 text-center text-gray-500">
        <p>Professor-led quiz results will be displayed here.</p>
        <p className="text-sm mt-2">This feature is coming soon.</p>
      </CardContent>
    </Card>
  );
}

