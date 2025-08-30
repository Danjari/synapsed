"use client"

import type * as React from "react"
import { BookOpen, FileText, LayoutDashboard, LineChart, Settings, Users } from "lucide-react"
import Sidebar, { SidebarItem } from "@/components/teacher/SideBar"
import TopNav from "@/components/teacher/TopNav"

interface TeacherDashboardProps {
  children: React.ReactNode
  activeSection: string
  setActiveSection: (section: string) => void
}

export function TeacherDashboard({ children, activeSection, setActiveSection }: TeacherDashboardProps) {
  const classMenuItems: SidebarItem[] = [
    { id: "class-info", name: "Class Info & Settings", icon: Settings },
    { id: "student-management", name: "Student Management", icon: Users },
    { id: "content-management", name: "Content Management", icon: FileText },
    { id: "survey-learning-path", name: "Survey & Learning Path", icon: BookOpen },
    { id: "quizzes-assessments", name: "Quizzes & Assessments", icon: LayoutDashboard },
    { id: "analytics", name: "Analytics", icon: LineChart },
  ]

  return (
    <div className="flex min-h-screen">
      <Sidebar items={classMenuItems} activeId={activeSection} onSelect={setActiveSection} />
      <div className="flex-1 flex flex-col bg-gray-50">
        <TopNav />
        <main className="p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
