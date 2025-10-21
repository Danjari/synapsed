"use client"

import { useEffect, useState } from "react"
import { Eye, MoreHorizontal, CheckCircle2, XCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import StudentSurveyDialog from "./Dialogs/StudentViewSurveyAnswerDialog"
import ProfessorPathwayPreviewDialog from "./Dialogs/ProfessorPathwayPreviewDialog"
import { PathwayData } from "@/lib/types/pathwayTypes"

type Survey = {
  id: string
  title: string
  status: string
}

type StudentProgress = {
  studentId: string
  name: string
  email: string
  surveyStatus: 'not_started' | 'completed'
  pathStatus: 'none' | 'pending' | 'approved' | 'rejected'
  surveyResponse?: {
    surveyId: string
    submittedAt: string
    answers: { question: string; answer: string }[]
  }
  pathway?: PathwayData
}

interface StudentProgressTableProps {
  classId: string
  surveys: Survey[]
}

export function StudentProgressTable({ classId, surveys }: StudentProgressTableProps) {
  const [students, setStudents] = useState<StudentProgress[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSurveyViewOpen, setIsSurveyViewOpen] = useState(false)
  const [selectedStudentResponse, setSelectedStudentResponse] = useState<StudentProgress | null>(null)
  const [isPathwayViewOpen, setIsPathwayViewOpen] = useState(false)
  const [selectedPathway, setSelectedPathway] = useState<PathwayData | null>(null)

  useEffect(() => {
    fetchStudentProgress()
  }, [classId])

  const fetchStudentProgress = async () => {
    try {
      setLoadingStudents(true)
      
      // Fetch class enrollments
      const enrollmentsResponse = await fetch(`/api/class/${classId}/students`)
      if (!enrollmentsResponse.ok) throw new Error('Failed to fetch enrollments')
      const enrolledStudents = await enrollmentsResponse.json()

      // Fetch pathways
      const pathwaysResponse = await fetch(`/api/pathway/professor/${classId}`)
      const pathwaysData = await pathwaysResponse.json()
      const pathways = pathwaysData.pathways || []

      // Fetch survey responses for all active surveys
      const activeSurveys = surveys.filter(s => s.status === 'ACTIVE')
      const responsePromises = activeSurveys.map(survey =>
        fetch(`/api/survey/response/${classId}?surveyId=${survey.id}`)
          .then(res => res.json())
          .catch(() => [])
      )
      const allResponses = (await Promise.all(responsePromises)).flat()

      // Build student progress data
      const studentProgress: StudentProgress[] = enrolledStudents.map((enrollment: {
        student: { id: string; name: string | null; email: string }
      }) => {
        const student = enrollment.student
        const studentResponses = allResponses.filter((r: { studentId: string }) => r.studentId === student.id)
        const studentPathways = pathways.filter((p: { studentId: string }) => p.studentId === student.id)
        
        const latestResponse = studentResponses.length > 0 ? studentResponses[0] : null
        const latestPathway = studentPathways.length > 0 ? studentPathways[0] : null

        return {
          studentId: student.id,
          name: student.name || student.email,
          email: student.email,
          surveyStatus: latestResponse ? 'completed' : 'not_started',
          pathStatus: latestPathway 
            ? latestPathway.status 
            : 'none',
          surveyResponse: latestResponse,
          pathway: latestPathway,
        }
      })

      setStudents(studentProgress)
    } catch (error) {
      console.error('Error fetching student progress:', error)
      toast("Error", {
        description: "Failed to load student progress"
      })
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(new Set(students.map(s => s.studentId)))
    } else {
      setSelectedStudents(new Set())
    }
  }

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    const newSelected = new Set(selectedStudents)
    if (checked) {
      newSelected.add(studentId)
    } else {
      newSelected.delete(studentId)
    }
    setSelectedStudents(newSelected)
  }

  const handleGeneratePaths = () => {
    if (selectedStudents.size === 0) {
      toast("Error", {
        description: "Please select at least one student"
      })
      return
    }

    const activeSurveys = surveys.filter(s => s.status === 'ACTIVE')
    if (activeSurveys.length === 0) {
      toast("Error", {
        description: "No active surveys available. Please create and publish a survey first."
      })
      return
    }

    // Set default survey if only one active
    if (activeSurveys.length === 1) {
      setSelectedSurveyId(activeSurveys[0].id)
    }

    setIsGenerateDialogOpen(true)
  }

  const handleConfirmGenerate = async () => {
    if (!selectedSurveyId) {
      toast("Error", {
        description: "Please select a survey"
      })
      return
    }

    try {
      setIsGenerating(true)

      const mode = selectedStudents.size === 1 
        ? 'individual' 
        : selectedStudents.size === students.length 
        ? 'all' 
        : 'selected'

      const response = await fetch('/api/learning-paths/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          surveyId: selectedSurveyId,
          mode,
          studentIds: Array.from(selectedStudents),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate learning paths')
      }

      const data = await response.json()

      toast("Learning paths generated", {
        description: `Successfully generated ${data.generated} learning path(s). ${data.failed > 0 ? `Failed: ${data.failed}` : ''}`
      })

      setIsGenerateDialogOpen(false)
      setSelectedStudents(new Set())
      fetchStudentProgress()
    } catch (error) {
      console.error('Error generating learning paths:', error)
      toast("Error", {
        description: "Failed to generate learning paths"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApprovePathway = async (pathway: PathwayData) => {
    try {
      const response = await fetch(`/api/pathway/professor/${classId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathwayId: pathway.id,
          status: "approved",
        }),
      })
      
      if (response.ok) {
        toast("Pathway approved", { 
          description: "Student can now access this pathway." 
        })
        fetchStudentProgress()
      }
    } catch {
      toast("Error", { description: "Failed to approve pathway." })
    }
  }

  const handleRejectPathway = async (pathway: PathwayData) => {
    try {
      const response = await fetch(`/api/pathway/professor/${classId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathwayId: pathway.id,
          status: "rejected",
        }),
      })
      
      if (response.ok) {
        toast("Pathway rejected", { 
          description: "Student will not see this pathway." 
        })
        fetchStudentProgress()
      }
    } catch {
      toast("Error", { description: "Failed to reject pathway." })
    }
  }

  const getStatusBadge = (status: StudentProgress['surveyStatus'] | StudentProgress['pathStatus']) => {
    switch (status) {
      case 'not_started':
        return <Badge variant="outline">Not Started</Badge>
      case 'completed':
        return <Badge variant="default">Completed</Badge>
      case 'none':
        return <Badge variant="outline">None</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending Review</Badge>
      case 'approved':
        return <Badge variant="default" className="bg-green-500">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const activeSurveys = surveys.filter(s => s.status === 'ACTIVE')

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Student Progress</CardTitle>
            <CardDescription>Track survey completion and learning path status</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleGeneratePaths} 
              disabled={selectedStudents.size === 0}
            >
              Generate Learning Paths ({selectedStudents.size})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedStudents.size === students.length && students.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Survey Status</TableHead>
                  <TableHead>Path Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingStudents ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                    </TableRow>
                  ))
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No students enrolled yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell>
                        <Checkbox
                          checked={selectedStudents.has(student.studentId)}
                          onCheckedChange={(checked) =>
                            handleSelectStudent(student.studentId, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{getStatusBadge(student.surveyStatus)}</TableCell>
                      <TableCell>{getStatusBadge(student.pathStatus)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {student.surveyResponse && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedStudentResponse(student)
                                  setIsSurveyViewOpen(true)
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Survey
                              </DropdownMenuItem>
                            )}
                            {student.pathway && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedPathway(student.pathway || null)
                                    setIsPathwayViewOpen(true)
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Pathway
                                </DropdownMenuItem>
                                {student.pathStatus === 'pending' && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => student.pathway && handleApprovePathway(student.pathway)}
                                    >
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => student.pathway && handleRejectPathway(student.pathway)}
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Reject
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </>
                            )}
                            {student.surveyResponse && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedStudents(new Set([student.studentId]))
                                  handleGeneratePaths()
                                }}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {student.pathway ? 'Regenerate Path' : 'Generate Path'}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Generate Dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Learning Paths</DialogTitle>
            <DialogDescription>
              Select which survey to base the learning paths on
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Survey</Label>
              {activeSurveys.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active surveys available. Please create and publish a survey first.
                </p>
              ) : (
                <select
                  value={selectedSurveyId}
                  onChange={(e) => setSelectedSurveyId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a survey...</option>
                  {activeSurveys.map((survey) => (
                    <option key={survey.id} value={survey.id}>
                      {survey.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Generating learning paths for {selectedStudents.size} student(s)
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsGenerateDialogOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmGenerate} 
              disabled={isGenerating || !selectedSurveyId}
            >
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Survey View Dialog */}
      <StudentSurveyDialog
        open={isSurveyViewOpen}
        onClose={() => setIsSurveyViewOpen(false)}
        studentName={selectedStudentResponse?.name}
        completedAt={selectedStudentResponse?.surveyResponse?.submittedAt}
        answers={selectedStudentResponse?.surveyResponse?.answers}
      />

      {/* Pathway Preview Dialog */}
      <ProfessorPathwayPreviewDialog
        key={selectedPathway?.id || 'dialog'}
        open={isPathwayViewOpen}
        onClose={() => setIsPathwayViewOpen(false)}
        pathway={selectedPathway}
        classId={classId}
        onPathwayUpdate={fetchStudentProgress}
      />
    </>
  )
}

