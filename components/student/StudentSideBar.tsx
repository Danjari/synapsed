"use client"
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, BookOpen, MessageSquare, Award, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true); // Toggle sidebar

  const menuItems = [
    { name: "Home", icon: <Home size={20} />, path: "/" },
    { name: "My Courses", icon: <BookOpen size={20} />, path: "/courses" },
    { name: "Feedback", icon: <MessageSquare size={20} />, path: "/feedback" },
    { name: "Test", icon: <Award size={20} />, path: "/test" },
    { name: "Achievements", icon: <Award size={20} />, path: "/achievements" },
    { name: "Certificate", icon: <Award size={20} />, path: "/certificate" },
    { name: "Settings", icon: <Settings size={20} />, path: "/settings" },
  ];

  return (
    <aside
      className={`bg-white h-screen p-4 shadow-lg border-r transition-all duration-300 ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      {/* Sidebar Header */}
      <div className="flex justify-between items-center pb-4 border-b">
        <h1
          className={`text-xl font-semibold text-gray-800 transition-opacity ${
            isOpen ? "opacity-100" : "opacity-0 hidden"
          }`}
        >
          SynapsEd.
        </h1>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="mt-6 space-y-2">
        {menuItems.map((item) => (
          <div
            key={item.name}
            onClick={() => router.push(item.path)}
            className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition ${
              pathname === item.path
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            {item.icon}
            {isOpen && <span className="font-medium">{item.name}</span>}
          </div>
        ))}
      </nav>

      {/* Profile Section */}
      <div className="absolute bottom-4 left-4 flex items-center space-x-3">
        <Image
          src="/logo.svg"
          alt="User Avatar"
          width={50}
          height={50}
          className="w-10 h-10 rounded-full border"
        />
        {isOpen && (
          <div>
            <p className="text-sm font-semibold">Bob</p>
            <p className="text-xs text-gray-500">Premium Account</p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;