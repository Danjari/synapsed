"use client";

import TeacherSidebar, { type SidebarItem } from "@/components/teacher/SideBar";
import { Home, BookOpen, MessageSquare, Award, Settings } from "lucide-react";

interface StudentSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export default function StudentSidebar({ user }: StudentSidebarProps) {
  const items: SidebarItem[] = [
    { name: "Dashboard", path: "/student/dashboard", icon: Home },
    { name: "Join a Class", path: "/student/join", icon: BookOpen },
    { name: "Feedback", path: "/feedback", icon: MessageSquare },
    { name: "Achievements", path: "/achievements", icon: Award },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return <TeacherSidebar items={items} user={user} />;
}


