"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type SurveyQuestion = {
  id: string;
  text: string;
  type: "short-answer" | "multiple-choice";
  options?: string[];
};

type SurveyState = "intro" | "survey" | "submitted";

export default function StudentSurveyScreen() {
  const { data: session } = useSession();
  const router = useRouter();
  const { classId } = useParams();
  const studentId = session?.user?.id;

  const [state, setState] = useState<SurveyState>("intro");
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [current, setCurrent] = useState(0);

  // Load survey questions
  useEffect(() => {
    if (!classId) return;

    fetch(`/api/survey/${classId}`)
      .then(res => res.json())
      .then(data => setQuestions(data?.questions || []));
  }, [classId]);

  const handleAnswer = (value: string) => {
    setAnswers(prev => ({ ...prev, [questions[current].id]: value }));
  };

  const handleSubmit = async () => {
    const payload = {
      studentId,
      classId,
      answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
    };

    const res = await fetch("/api/survey/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast("Survey submitted", { description: "Thanks for your answers!" });
      setState("submitted");
    } else {
      toast("Error", { description: "Submission failed" });
    }
  };

  // UI states
  if (state === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">Welcome to Your Class!</h1>
          <p className="text-xl text-slate-600 mb-8">
            Let’s start with a short survey so we can customize your learning path.
          </p>
          <Button
            onClick={() => setState("survey")}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 hover:scale-105"
          >
            Start Survey
          </Button>
        </div>
      </div>
    );
  }

  if (state === "submitted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-purple-50 p-6">
        <Card className="text-center max-w-xl w-full">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-slate-800 mb-2">Thank You!</CardTitle>
            <p className="text-slate-600">Your answers have been recorded. Your personalized path is on the way 🚀</p>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push(`/class/${classId}`)} className="mt-6">
              Go to Class
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-slate-800 mb-2">{q?.text}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {q?.type === "short-answer" && (
            <textarea
              value={answers[q.id] || ""}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Type your answer..."
              className="w-full p-3 border rounded-md"
              rows={4}
            />
          )}

          {q?.type === "multiple-choice" && (
            <div className="space-y-2">
              {q.options?.map((opt, index) => (
                <label
                  key={index}
                  className={`block border p-3 rounded-lg cursor-pointer ${
                    answers[q.id] === opt
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={opt}
                    className="mr-2"
                    checked={answers[q.id] === opt}
                    onChange={() => handleAnswer(opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrent((c) => c - 1)}
              disabled={current === 0}
            >
              Back
            </Button>

            {current < questions.length - 1 ? (
              <Button
                onClick={() => setCurrent((c) => c + 1)}
                disabled={!answers[q.id]}
              >
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!answers[q.id]}>
                Submit Survey
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}