"use client";
import { useState, useEffect } from "react";
import { PlusCircle, Users } from "lucide-react";
import Sidebar from "@/components/teacher/SideBar";
import TopNav from "@/components/teacher/TopNav";
import CreateClassModal from "@/components/teacher/CreateClassModal";

type ClassType = {
  id: string;
  name: string;
  students: number;
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    // Mock API Call (Replace with actual API later)
    setClasses([
      { id: "1", name: "Linear Algebra", students: 35 },
      { id: "2", name: "Machine Learning", students: 40 },
      { id: "3", name: "Data Structures", students: 28 },
    ]);
  }, []);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col bg-gray-50">
        <TopNav />
        <main className="p-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Your Classes</h1>
            <button className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700" onClick={() => setModalOpen(true)}>
              <PlusCircle className="h-5 w-5 mr-2" /> Add Class
            </button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            {classes.map((cls) => (
              <div key={cls.id} className="p-4 bg-white rounded-md shadow hover:shadow-md transition">
                <h3 className="text-lg font-semibold">{cls.name}</h3>
                <div className="text-gray-600 flex items-center mt-2">
                  <Users className="h-4 w-4 mr-2" /> {cls.students} Students
                </div>
                <button className="mt-3 text-blue-600 hover:underline" onClick={() => alert(`Manage ${cls.name}`)}>Manage</button>
              </div>
            ))}
          </div>
          {/* Create Class Modal */}
          <CreateClassModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
        </main>
      </div>
    </div>
  );
}