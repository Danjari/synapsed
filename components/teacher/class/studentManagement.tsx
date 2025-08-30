"use client"

import { useEffect, useState } from "react"
import { MoreHorizontal, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import TableSkeleton from "@/components/ui/table-skeleton"

interface Student {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  status: "active" | "pending";
}

interface Enrollment {
  student: {
    id: string;
    name: string;
    email: string;
  };
  joinedAt: string;
}

export function StudentManagement({ classId }: { classId: string }) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/class/${classId}/students`)
        const data = await res.json()
        setStudents(
          data.map((enrollment: Enrollment) => ({
            id: enrollment.student.id,
            name: enrollment.student.name,
            email: enrollment.student.email,
            joinDate: enrollment.joinedAt,
            status: "active",
          }))
        )
      } finally {
        setLoading(false)
      }
    }

    if (classId) fetchStudents()
  }, [classId])

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleRemoveStudent = async () => {
    toast.success("Student removed", {
      description: `${studentToRemove?.name} has been removed from the class.`,
    })
    setStudents((prev) => prev.filter((s) => s.id !== studentToRemove?.id))
    setIsRemoveDialogOpen(false)

    await fetch(`/api/class/${classId}/student/${studentToRemove?.id}`, {
      method: "DELETE",
    })
  }

  const handleResendInvite = (student: Student) => {
    toast.success("Invite resent", {
      description: `Invitation has been resent to ${student.email}.`,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Student Management</h2>
        <p className="text-muted-foreground">Manage students enrolled in your class.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Students</CardTitle>
            <CardDescription>Manage your class roster and invitations.</CardDescription>
          </div>
          <Button>
            <Send className="mr-2 h-4 w-4" />
            Invite Students
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            {loading ? (
              <div className="max-w-sm">
                <div className="animate-pulse h-10 bg-primary/10 rounded-md" />
              </div>
            ) : (
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            )}
          </div>
          <div className="rounded-md border">
            {loading ? (
              <TableSkeleton columns={5} rows={6} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden md:table-cell">Join Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(student.joinDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={student.status === "active" ? "default" : "secondary"}>
                          {student.status === "active" ? "Active" : "Pending"}
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
                            {student.status === "pending" && (
                              <DropdownMenuItem onClick={() => handleResendInvite(student)}>
                                Resend Invite
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setStudentToRemove(student)
                                setIsRemoveDialogOpen(true)
                              }}
                            >
                              Remove Student
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {studentToRemove?.name} from this class? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveStudent}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
