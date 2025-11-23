"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/components/teacher/SideBar";
import TopNav from "@/components/teacher/TopNav";
import { AssessmentResultsDashboard } from "@/components/teacher/assessments/AssessmentResultsDashboard";

function AssessmentResultsContent() {
  const params = useParams();
  const classId = params.classId as string;

  if (!classId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Invalid class ID</div>
      </div>
    );
  }

  return <AssessmentResultsDashboard classId={classId} />;
}

export default function AssessmentResultsPage() {
  return (
    <div className="min-h-screen">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopNav />
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  Loading...
                </div>
              }
            >
              <AssessmentResultsContent />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}

