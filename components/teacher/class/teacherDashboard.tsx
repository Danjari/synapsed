"use client"

import type * as React from "react"
import { BookOpen, FileText, LayoutDashboard, LineChart, Settings, Users, ChevronDown, Bell } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface TeacherDashboardProps {
  children: React.ReactNode
  activeSection: string
  setActiveSection: (section: string) => void
}

export function TeacherDashboard({ children, activeSection, setActiveSection }: TeacherDashboardProps) {
  const navItems = [
    {
      id: "class-info",
      title: "Class Info & Settings",
      icon: Settings,
    },
    {
      id: "student-management",
      title: "Student Management",
      icon: Users,
    },
    {
      id: "content-management",
      title: "Content Management",
      icon: FileText,
    },
    {
      id: "survey-learning-path",
      title: "Survey & Learning Path",
      icon: BookOpen,
    },
    {
      id: "quizzes-assessments",
      title: "Quizzes & Assessments",
      icon: LayoutDashboard,
    },
    {
      id: "analytics",
      title: "Analytics",
      icon: LineChart,
    },
  ]

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar>
          <SidebarHeader className="flex h-16 items-center border-b px-6">
            <div className="flex items-center gap-2 font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                AI
              </div>
              <span>EduAI Platform</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton isActive={activeSection === item.id} onClick={() => setActiveSection(item.id)}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg" alt="Teacher" />
                <AvatarFallback>TC</AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-sm">
                <span className="font-medium">Teacher Name</span>
                <span className="text-xs text-muted-foreground">teacher@example.com</span>
              </div>
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-lg font-semibold">Advanced Physics 101</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-primary"></span>
                <span className="sr-only">Notifications</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder.svg" alt="Teacher" />
                      <AvatarFallback>TC</AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline-block">Teacher</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
