import Sidebar from "@/components/teacher/SideBar";
import TopNav from "@/components/teacher/TopNav";

export default function TeacherDashboard() {
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
          <h1 className="text-2xl font-bold">Welcome, Professor</h1>
          <p className="text-gray-600">Here&apos;s a quick overview of your classes and students.</p>

          {/* Cards */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="p-4 bg-blue-100 rounded-md shadow">
              <h3 className="text-lg">📚 Total Classes</h3>
              <p className="text-2xl font-bold">5</p>
            </div>
            <div className="p-4 bg-green-100 rounded-md shadow">
              <h3 className="text-lg">👨‍🎓 Total Students</h3>
              <p className="text-2xl font-bold">120</p>
            </div>
            <div className="p-4 bg-yellow-100 rounded-md shadow">
              <h3 className="text-lg">✅ Pathways Approved</h3>
              <p className="text-2xl font-bold">20</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}