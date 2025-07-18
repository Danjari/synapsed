"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ClassEntryPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { classId } = useParams();

  useEffect(() => {
    const checkSurveyStatus = async () => {
      if (!session?.user?.id || !classId) return;

      const res = await fetch(`/api/survey/submitted?studentId=${session.user.id}&classId=${classId}`);
      const data = await res.json();

      if (data.submitted) {
        router.push(`/class/${classId}/pathway`);
      } else {
        router.push(`/class/${classId}/survey`);
      }
    };

    checkSurveyStatus();
  }, [session?.user?.id, classId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin w-6 h-6 text-slate-500" />
      <span className="ml-2 text-slate-500">Loading your class...</span>
    </div>
  );
}