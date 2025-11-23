"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { AssessmentDetailView } from "./AssessmentDetailView";
import type { StudentAssessmentData } from "@/lib/types/assessments";

type StudentData = StudentAssessmentData;

interface StudentDetailViewProps {
  student: StudentData;
}

export function StudentDetailView({ student }: StudentDetailViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  if (student.nodes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No assessments completed for any nodes yet.
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Node Breakdown</h3>
      {student.nodes.map((node) => (
        <Card key={node.nodeId} className="overflow-hidden">
          <CardHeader
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleNode(node.nodeId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {expandedNodes.has(node.nodeId) ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <CardTitle className="text-base">{node.nodeTitle}</CardTitle>
                  {node.nodeDescription && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                      {node.nodeDescription}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant="outline">
                {node.assessments.length} assessment{node.assessments.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardHeader>
          {expandedNodes.has(node.nodeId) && (
            <CardContent className="pt-0">
              <div className="space-y-4 mt-4">
                {node.assessments.map((assessment) => (
                  <AssessmentDetailView
                    key={assessment.assessmentId}
                    assessment={assessment}
                  />
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

