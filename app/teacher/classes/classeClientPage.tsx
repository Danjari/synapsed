'use client'
import { useState, useEffect, useCallback } from "react";
import { PlusCircle, Users } from "lucide-react";
import Sidebar from "@/components/teacher/SideBar";
import TopNav from "@/components/teacher/TopNav";
import CreateClassModal from "@/components/teacher/CreateClassModal";


type ClassType = {
    id: string;
    title: string;
    studentsCount: number; 
  };
type Props = {
    professorId:string;
}

type Enrollment = { [key: string]: unknown };
type ApiClass = { id: string; title: string; enrollments?: Enrollment[] };

export default function ClassesPage({professorId} : Props) {
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);

  const fetchClasses = useCallback(async () => {
    const res = await fetch(`/api/professor/classes?professorId=${professorId}`);
    const data = await res.json();

    const mappedClasses = (data as ApiClass[]).map((cls) => ({
      id: cls.id,
      title: cls.title,
      studentsCount: cls.enrollments?.length || 0,
    }));

    setClasses(mappedClasses);
  }, [professorId]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

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
                <h3 className="text-lg font-semibold">{cls.title}</h3>
                <div className="text-gray-600 flex items-center mt-2">
                  <Users className="h-4 w-4 mr-2" /> {cls.studentsCount} Students
                </div>
                <button className="mt-3 text-blue-600 hover:underline" onClick={() => window.location.href = `/teacher/classes/${cls.id}`}>Manage</button>
              </div>
            ))}
          </div>
          {/* Create Class Modal */}
          <CreateClassModal professorId={professorId} isOpen={isModalOpen} onClose={() => setModalOpen(false)}  refreshClasses={fetchClasses}/>
        </main>
      </div>
    </div>
  );
}