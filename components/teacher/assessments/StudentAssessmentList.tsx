"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StudentDetailView } from "./StudentDetailView";
import type { StudentAssessmentData } from "@/lib/types/assessments";

type StudentData = StudentAssessmentData;

interface StudentAssessmentListProps {
  classId: string;
}

export function StudentAssessmentList({ classId }: StudentAssessmentListProps) {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [aggregates, setAggregates] = useState<{
    totalStudents: number;
    totalAssessments: number;
    averageScore: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [studentsRes, aggregatesRes] = await Promise.all([
        fetch(`/api/professor/assessments/${classId}`),
        fetch(`/api/professor/assessments/${classId}/aggregates`),
      ]);

      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudents(data.students || []);
      }

      if (aggregatesRes.ok) {
        const data = await aggregatesRes.json();
        setAggregates({
          totalStudents: data.totalStudents || 0,
          totalAssessments: data.totalAssessments || 0,
          averageScore: data.averageScore,
        });
      }
    } catch (error) {
      console.error("Error fetching assessment data:", error);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getScoreColor = (score: number | null) => {
    if (score === null) return "bg-gray-500";
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getScoreTextColor = (score: number | null) => {
    if (score === null) return "text-gray-700";
    if (score >= 80) return "text-green-700";
    if (score >= 60) return "text-yellow-700";
    return "text-red-700";
  };

  const filteredStudents = students.filter(
    (student) =>
      student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading assessment data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      {aggregates && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aggregates.totalStudents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Assessments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aggregates.totalAssessments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {aggregates.averageScore !== null
                  ? `${aggregates.averageScore.toFixed(0)}%`
                  : "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Student List */}
      <div className="space-y-4">
        {filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              {searchQuery
                ? "No students found matching your search."
                : "No students with assessments found."}
            </CardContent>
          </Card>
        ) : (
          filteredStudents.map((student) => (
            <Card key={student.studentId} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() =>
                  setExpandedStudent(
                    expandedStudent === student.studentId ? null : student.studentId
                  )
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedStudent === student.studentId ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <CardTitle className="text-lg">{student.studentName}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{student.studentEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div
                        className={`text-3xl font-bold ${getScoreTextColor(
                          student.aggregateScore
                        )}`}
                      >
                        {student.aggregateScore !== null
                          ? `${student.aggregateScore.toFixed(0)}%`
                          : "N/A"}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Based on {student.assessmentCount} assessment
                        {student.assessmentCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Badge
                      className={`${getScoreColor(student.aggregateScore)} text-white`}
                    >
                      {student.aggregateScore !== null
                        ? student.aggregateScore >= 80
                          ? "Excellent"
                          : student.aggregateScore >= 60
                          ? "Good"
                          : "Needs Improvement"
                        : "No Data"}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-gray-600">{student.performanceNotes}</p>
                </div>
              </CardHeader>
              {expandedStudent === student.studentId && (
                <CardContent className="pt-0">
                  <StudentDetailView student={student} />
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

