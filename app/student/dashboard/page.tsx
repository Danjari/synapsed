import Sidebar from "@/components/student/StudentSideBar";
import StudentDashboard from "@/components/student/StudentDashboard"

export default function StudentPage() {
  return (
    <div className="flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Dashboard Component */}
      <div className="flex-1">
        <StudentDashboard />
      </div>
    </div>
  );
}