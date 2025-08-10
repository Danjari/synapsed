import Sidebar from "@/components/teacher/SideBar";
import TopNav from "@/components/teacher/TopNav";

export default function TeacherDashboardPage() {
  return (
    <div className="flex h-screen">
      {/* Sidebar on the left */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Top Navigation */}
        <TopNav />

        {/* Dashboard Content */}
        <main className="p-6">
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
            <p className="text-gray-600">Welcome to your teaching dashboard.</p>
            {/* Add your dashboard content here */}
          </div>
        </main>
      </div>
    </div>
  );
}