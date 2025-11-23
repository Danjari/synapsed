"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

interface AssessmentData {
  assessmentId: string;
  topic: string;
  submittedAt: string;
  score: number | null;
  feedback: string | null;
  responses: Record<string, any>;
  fields: any[];
  correctAnswers: Record<string, any>;
}

interface AssessmentDetailViewProps {
  assessment: AssessmentData;
}

export function AssessmentDetailView({ assessment }: AssessmentDetailViewProps) {
  const [expanded, setExpanded] = useState(false);

  const getScoreColor = (score: number | null) => {
    if (score === null) return "bg-gray-500";
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const formatAnswer = (answer: any): string => {
    if (Array.isArray(answer)) {
      return answer.join(", ");
    }
    if (typeof answer === "boolean") {
      return answer ? "Yes" : "No";
    }
    return String(answer);
  };

  const isAnswerCorrect = (question: string, studentAnswer: any): boolean => {
    // Find the field that matches this question label
    const field = assessment.fields.find((f: any) => f.label === question);
    if (!field) return false;
    
    // Get correct answer using field name (correctAnswers uses field names as keys)
    const correctAnswer = assessment.correctAnswers[field.name];
    if (correctAnswer === undefined) return false;

    // Handle arrays (multiselect)
    if (Array.isArray(correctAnswer)) {
      const studentArray = Array.isArray(studentAnswer)
        ? studentAnswer.map(String)
        : [String(studentAnswer)];
      const correctArray = correctAnswer.map(String);
      return (
        studentArray.length === correctArray.length &&
        correctArray.every((val) => studentArray.includes(val))
      );
    }

    // Handle booleans
    if (typeof correctAnswer === "boolean") {
      return studentAnswer === correctAnswer;
    }

    // Handle numbers
    if (typeof correctAnswer === "number") {
      const studentNum =
        typeof studentAnswer === "number"
          ? studentAnswer
          : parseFloat(String(studentAnswer));
      return !isNaN(studentNum) && studentNum === correctAnswer;
    }

    // Handle strings (case-insensitive)
    const studentStr = String(studentAnswer).toLowerCase().trim();
    const correctStr = String(correctAnswer).toLowerCase().trim();
    return studentStr === correctStr;
  };

  const submittedDate = new Date(assessment.submittedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {expanded ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <CardTitle className="text-base">{assessment.topic}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Completed: {submittedDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {assessment.score !== null && (
              <div className="text-right">
                <div
                  className={`text-xl font-bold ${
                    assessment.score >= 80
                      ? "text-green-700"
                      : assessment.score >= 60
                      ? "text-yellow-700"
                      : "text-red-700"
                  }`}
                >
                  {assessment.score.toFixed(0)}%
                </div>
              </div>
            )}
            <Badge className={getScoreColor(assessment.score)}>
              Score: {assessment.score !== null ? `${assessment.score.toFixed(0)}%` : "N/A"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-6">
            {/* Questions & Answers */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Questions & Answers</h4>
              <div className="space-y-4">
                {Object.entries(assessment.responses).map(([question, answer]) => {
                  const correct = isAnswerCorrect(question, answer);
                  // Find correct answer by matching field label to field name
                  const field = assessment.fields.find((f: any) => f.label === question);
                  const correctAnswer = field ? assessment.correctAnswers[field.name] : undefined;

                  return (
                    <div
                      key={question}
                      className="border rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-start gap-3">
                        {correct ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 mb-2">
                            Q: {question}
                          </p>
                          <p className="text-sm text-gray-700 mb-1">
                            <span className="font-medium">Student Answer:</span>{" "}
                            {formatAnswer(answer)}
                          </p>
                          {!correct && correctAnswer !== undefined && (
                            <p className="text-sm text-green-700">
                              <span className="font-medium">Correct Answer:</span>{" "}
                              {formatAnswer(correctAnswer)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Feedback */}
            {assessment.feedback && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">AI Feedback</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {assessment.feedback}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

