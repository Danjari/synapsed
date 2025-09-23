"use client";

import TeacherSidebar, { type SidebarItem } from "@/components/teacher/SideBar";
import { Home, BookOpen, MessageSquare, Award, Settings } from "lucide-react";

export default function StudentSidebar() {
  const items: SidebarItem[] = [
    { name: "Dashboard", path: "/student/dashboard", icon: Home },
    { name: "Join a Class", path: "/student/join", icon: BookOpen },
    { name: "Feedback", path: "/feedback", icon: MessageSquare },
    { name: "Achievements", path: "/achievements", icon: Award },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return <TeacherSidebar items={items} />;
}


