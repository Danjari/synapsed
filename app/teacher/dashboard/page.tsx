import Sidebar from "@/components/teacher/SideBar";
import TopNav from "@/components/teacher/TopNav";
import { Dispatch, SetStateAction, ReactNode } from "react";

interface TeacherDashboardProps {
  children: ReactNode;
  activeSection: string;
  setActiveSection: Dispatch<SetStateAction<string>>;
}

export default function TeacherDashboard({ children, activeSection, setActiveSection }: TeacherDashboardProps) {
  return (
    <div className="flex h-screen">
      {/* Sidebar on the left */}
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Top Navigation */}
        <TopNav />

        {/* Dashboard Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}