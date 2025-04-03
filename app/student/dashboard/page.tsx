import StudentDashboard from "@/components/student/StudentDashboard"
import Sidebar from "@/components/student/StudentSideBar";

export default function StudentPage() {
  return (
    <div className="flex">
      <Sidebar/>
      {/* Student Dashboard */}
      <div className="flex-1">
      <StudentDashboard />
      </div>
    </div>
  );
}