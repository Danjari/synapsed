"use client"
import { Bell, Search,Calendar, Book } from "lucide-react"; // Import icons for UI
import CourseCard from "./CourseCard"; // Import CourseCard component for displaying courses
import TaskList from "./TaskList"; // Import TaskList component for displaying tasks
import ProgressSection from "./ProgressSection"; // Import ProgressSection component for displaying progress
import {User} from "next-auth" // Import User type from next-auth for user authentication
import { useEffect, useState } from "react"; // Import React hooks for state management and side effects
import { useSession } from "next-auth/react"; // Import useSession hook from next-auth/react for session management
import { Button } from "../ui/button"; // Import Button component from ui for button functionality

// This file defines the StudentDashboard component, which is a client-side component that displays the student's dashboard.
// It fetches the student's classes and displays them in a course card format. It also displays a task list and progress section.
// The component uses the useSession hook from next-auth/react to check if the user is authenticated and fetches the classes based on the user's session.

type ClassType = {
  id: string;
  title: string;
  professor: { name: string };
  progress?: number;
  link?: string;
}; // Define the type for a class, including its properties

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
]; // Define dummy tasks for demonstration

const StudentDashboard = ({user}:{user?:User})=> {
  const { data: session } = useSession(); // Use the useSession hook to get the current session
  const [classes, setClasses] = useState<ClassType[]>([]); // State to hold the classes fetched from the API

  useEffect(() => {
    const fetchClasses = async () => {
      if (!session?.user?.id) return; // Check if the user is authenticated

      const res = await fetch(`/api/student/classes?enrollmentId=${session.user.id}`); // Fetch classes for the current user
      const data = await res.json();
      setClasses(data); // Update the state with the fetched classes
    };

    fetchClasses(); // Call the fetchClasses function
  }, [session?.user?.id]); // Dependency array to trigger the effect when the session changes

  return (
    <div className="p-6 bg-gray-50 min-h-screen flex flex-col space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Hi {user?.name}, welcome back</h1> 
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

        {classes.length === 0 ? (
          <div className="text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center">
            <p className="mb-2">No courses yet, wanna add a course?</p>
            <Button
              onClick={() => window.location.href = "/student/join"}
              variant={'outline'}
            >
              Join a Class
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {classes.map((cls) => (
              <CourseCard
                key={cls.id}
                title={cls.title}
                professor={cls.professor?.name || "Unknown"}
                progress={cls.progress || 0}
                link={`/class/${cls.id}`}
              />
            ))}
          </div>
        )}
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

export default StudentDashboard;