'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/student/StudentSideBar";
import StudentDashboard from "@/components/student/StudentDashboard";

export default function StudentPageClient() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return null;
  }

  if (!session) {
    router.replace("/sign-in");
    return null;
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