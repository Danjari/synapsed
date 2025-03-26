import { Bell, Search,Calendar, Book } from "lucide-react";
import CourseCard from "./CourseCard";
import TaskList from "./TaskList";
import ProgressSection from "./ProgressSection";

 
 const dummyCourses = [
  {
    id: 1,
    title: "Linear Algebra",
    professor: "Prof. X",
    progress: 41,
    link:"#",
  },
  {
    id: 2,
    title: "Machine Learning",
    professor: "Prof. Y",
    progress: 78,
    link:"#",
    },
  {
    id: 3,
    title: "Data Structures",
    professor: "Prof. Z",
    progress: 62,
    link:"#",
  },
  {
    id: 4,
    title: "Algorithms",
    professor: "Prof. A",
    progress: 30,
    link:"#",
  },
];

const dummyTasks = [
  {
    id: 1,
    title: "Basic Foundations - Linear Algebra",
    completed: false,
    progress: "1/5",
  },
  {
    id: 2,
    title: "Watch Video",
    completed: false,
  },
  {
    id: 3,
    title: "Finish Assessment",
    completed: true,
  },
  {
    id: 4,
    title: "Sensitivity Analysis - Finance",
    completed: false,
    progress: "6/12",
  },
];


export default function StudentDashboard() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen flex flex-col space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Hi Bob, welcome back</h1>
          <p className="text-lg text-gray-500 flex items-center">
            <Calendar size={18} className="mr-2" />
            Fall 24
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search"
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none bg-white shadow-sm"
            />
          </div>
          <div className="relative cursor-pointer">
            <Bell size={24} className="text-gray-600 hover:text-gray-800 transition" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">2</span>
          </div>
        </div>
      </div>

      {/* Courses Section */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
          <Book size={24} className="mr-2 text-[#006494]" />
          Courses in Progress
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dummyCourses.map((course) => (
            <CourseCard
              key={course.id}
              title={course.title}
              professor={course.professor}
              progress={course.progress}
              link={course.link}
            />
          ))}
        </div>
      </section>

      {/* Tasks and Progress Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tasks Section */}
        <TaskList tasks={dummyTasks} />

        {/* Progress Section */}
        <ProgressSection />
      </div>
    </div>
  );
}