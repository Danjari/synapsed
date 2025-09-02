'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/student/StudentSideBar";
import StudentDashboard from "@/components/student/StudentDashboard";

export default function StudentPageClient() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl font-semibold animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!session) {
    // Add a small delay to prevent immediate redirect during race condition
    setTimeout(() => {
      router.replace("/sign-in");
    }, 100);
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl font-semibold animate-pulse">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar user={session.user} />
      
      <div className="flex-1">
        <StudentDashboard user={session.user} />
      </div>
    </div>
  );
}

