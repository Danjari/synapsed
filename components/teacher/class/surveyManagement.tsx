"use client"

import { useEffect, useState } from "react"
import { CheckCircle, Edit, Eye, MoreHorizontal, Plus } from "lucide-react"
import StudentSurveyDialog from "./Dialogs/StudentViewSurveyAnswerDialog";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

// Sample learning paths
const learningPaths = [
  { id: 1, student: "Alex Johnson", generatedAt: "2023-09-06", status: "approved" },
  { id: 2, student: "Jamie Smith", generatedAt: "2023-09-07", status: "approved" },
  { id: 3, student: "Morgan Wilson", generatedAt: "2023-09-09", status: "pending" },
]

type SurveyResponse = {
  studentId: string;
  name: string;
  submittedAt: string;
  answers: { question: string; answer: string }[];
};

type SurveyQuestion = { id: string; text: string; type: string; options?: string[] };

export function SurveyLearningPath({ classId }: { classId: string }) {
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [selectedPath, setSelectedPath] = useState<(typeof learningPaths)[0] | null>(null)
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)
  const [isSurveyBuilderOpen, setIsSurveyBuilderOpen] = useState(false)
  const [isSurveyViewOpen, setIsSurveyViewOpen] = useState(false);
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([])
  const [selectedStudentResponse, setSelectedStudentResponse] = useState<SurveyResponse | null>(null);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false)
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);

  useEffect(() => {
    fetch(`/api/survey/${classId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.questions?.length) setSurveyQuestions(data.questions)
      })

    fetch(`/api/survey/response/${classId}`)
      .then((res) => res.json())
      .then((data) => setSurveyResponses(Array.isArray(data) ? data : []))
  }, [classId])

  const handleSaveSurvey = async () => {
    const res = await fetch("/api/survey/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        questions: surveyQuestions,
      }),
    })

    if (res.ok) {
      toast("Survey saved", {
        description: "Your survey has been saved successfully.",
      })
      setIsSaveConfirmOpen(false)
      setIsSurveyBuilderOpen(false)
    } else {
      toast("Error", {
        description: "Failed to save survey. Try again."
      })
    }
  }

  const handleApprovePathClick = () => {
    toast(
      "Learning path approved", { description: `Learning path for ${selectedPath?.student} has been approved.`, }
    )
    setIsPreviewDialogOpen(false)
  }

  const handleGeneratePaths = async () => {
    const res = await fetch("/api/pathway/generate/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId }),
    });
    if (res.ok) {
      toast("Learning paths generated", {
        description: "Learning paths are being generated for students with pending surveys.",
      });
    } else {
      toast("Error", {
        description: "Failed to generate learning paths. Try again.",
      });
    }
    setIsGenerateDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Survey & Learning Path</h2>
        <p className="text-muted-foreground">Create surveys and generate personalized learning paths.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Survey Management</CardTitle>
            <CardDescription>Create and manage student surveys.</CardDescription>
          </div>
          <Button onClick={() => setIsSurveyBuilderOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Create/Edit Survey
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="hidden md:table-cell">Completed At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surveyResponses.map((response) => (
                  <TableRow key={response.studentId}>
                    <TableCell className="font-medium">{response.name}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {new Date(response.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={response.answers.length > 0 ? "default" : "secondary"}>
                        {response.answers.length > 0 ? "Processed" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedStudentResponse(response);
                          setIsSurveyViewOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <StudentSurveyDialog
        open={isSurveyViewOpen}
        onClose={() => setIsSurveyViewOpen(false)}
        studentName={selectedStudentResponse?.name}
        completedAt={selectedStudentResponse?.submittedAt}
        answers={selectedStudentResponse?.answers}
      />


      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Learning Paths</CardTitle>
            <CardDescription>AI-generated personalized learning paths.</CardDescription>
          </div>
          <Button onClick={() => setIsGenerateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Learning Paths
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="hidden md:table-cell">Generated At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {learningPaths.map((path) => (
                  <TableRow key={path.id}>
                    <TableCell className="font-medium">{path.student}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {new Date(path.generatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={path.status === "approved" ? "default" : "secondary"}>
                        {path.status === "approved" ? "Approved" : "Pending"}
                      </Badge>
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
                              setSelectedPath(path)
                              setIsPreviewDialogOpen(true)
                            }}
                          >
                            Preview
                          </DropdownMenuItem>
                          {path.status === "pending" && <DropdownMenuItem>Approve</DropdownMenuItem>}
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

      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Learning Path Preview</DialogTitle>
            <DialogDescription>Preview the AI-generated learning path for {selectedPath?.student}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-semibold">Module 1: Quantum Mechanics Fundamentals</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Introduction to Wave Functions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Schrödinger Equation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Quantum Operators</span>
                </li>
              </ul>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-semibold">Module 2: Advanced Quantum Concepts</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Quantum Entanglement</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Quantum Tunneling</span>
                </li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
              Close
            </Button>
            {selectedPath?.status === "pending" && <Button onClick={handleApprovePathClick}>Approve Path</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Learning Paths</DialogTitle>
            <DialogDescription>
              Generate personalized learning paths for students with completed surveys.
            </DialogDescription>
          </DialogHeader>
          <p>
            This will generate learning paths for 2 students with pending survey responses. The AI will analyze their
            responses and create customized learning paths.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGeneratePaths}>Generate Paths</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSurveyBuilderOpen} onOpenChange={setIsSurveyBuilderOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Survey Builder for Advanced Physics 101</DialogTitle>
            <DialogDescription>Create and manage survey questions for your students.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Questions</h3>
              <Button
                onClick={() => {
                  const newQuestion = {
                    id: Date.now().toString(), // Changed to string to match SurveyQuestion type
                    text: "",
                    type: "short-answer",
                    options: [],
                  }
                  setSurveyQuestions([...surveyQuestions, newQuestion])
                }}
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </div>

            {surveyQuestions.map((question, index) => (
              <Card key={question.id} className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`question-${question.id}`}>Question {index + 1}</Label>
                        <Textarea
                          id={`question-${question.id}`}
                          value={question.text}
                          onChange={(e) => {
                            const updated = surveyQuestions.map((q) =>
                              q.id === question.id ? { ...q, text: e.target.value } : q,
                            )
                            setSurveyQuestions(updated)
                          }}
                          placeholder="Enter your question here..."
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Question Type</Label>
                        <select
                          value={question.type}
                          onChange={(e) => {
                            const updated = surveyQuestions.map((q) =>
                              q.id === question.id
                                ? {
                                    ...q,
                                    type: e.target.value,
                                    options:
                                      e.target.value === "multiple-choice"
                                        ? (q.options ?? []).length > 0
                                          ? q.options ?? []
                                          : [""]
                                        : [],
                                  }
                                : q,
                            )
                            setSurveyQuestions(updated)
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="short-answer">Short Answer</option>
                          <option value="multiple-choice">Multiple Choice</option>
                        </select>
                      </div>

                      {question.type === "multiple-choice" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Options</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const updated = surveyQuestions.map((q) =>
                                  q.id === question.id
                                    ? {
                                        ...q,
                                        options: [...(q.options ?? []), ""],
                                      }
                                    : q,
                                )
                                setSurveyQuestions(updated)
                              }}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Add Option
                            </Button>
                          </div>
                          {(question.options ?? []).map((option: string, optionIndex: number) => (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const updated = surveyQuestions.map((q) =>
                                    q.id === question.id
                                      ? {
                                          ...q,
                                          options: (q.options ?? []).map((opt: string, idx: number) =>
                                            idx === optionIndex ? e.target.value : opt,
                                          ),
                                        }
                                      : q,
                                  )
                                  setSurveyQuestions(updated)
                                }}
                                placeholder={`Option ${optionIndex + 1}`}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const updated = surveyQuestions.map((q) =>
                                    q.id === question.id
                                      ? {
                                          ...q,
                                          options: (q.options ?? []).filter((_: string, idx: number) => idx !== optionIndex),
                                        }
                                      : q,
                                  )
                                  setSurveyQuestions(updated)
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setSurveyQuestions(surveyQuestions.filter((q) => q.id !== question.id))
                      }}
                    >
                      Delete Question
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {surveyQuestions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No questions added yet. Click &quot;Add Question&quot; to get started.
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsSurveyBuilderOpen(false)}>
              Cancel
            </Button>
            <Button onClick= {handleSaveSurvey}>Save Survey</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSaveConfirmOpen} onOpenChange={setIsSaveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Survey</DialogTitle>
            <DialogDescription>
              Are you sure you want to save this survey? This will update the survey for all students in the class.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // In a real app, this would call an API to save the survey
                toast("Survey saved",{
                  description: "Your survey has been saved successfully.",
                })
                setIsSaveConfirmOpen(false)
                setIsSurveyBuilderOpen(false)
              }}
            >
              Save Survey
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
