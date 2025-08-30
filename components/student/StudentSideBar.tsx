"use client"
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, BookOpen, MessageSquare, Award, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { User } from "next-auth";
import { signOut } from "next-auth/react";
import { Role } from "@prisma/client";
//import { useSession } from "next-auth/react";

type UserWithRole = User & {
  role?: Role;
}

const Sidebar = ({ user }: { user?: UserWithRole }) => {
  //const { data: session } = useSession();
  //const user = session?.user;
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true); // Toggle sidebar

  const menuItems = [
    { name: "Home", icon: <Home size={20} />, path: "/" },
    { name: "Join a Class", icon: <BookOpen size={20} />, path: "/student/join" },
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

      {/* Profile + Sign Out Section */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Image
            src={user?.image || "/logo.svg"}
            alt="User Avatar"
            width={50}
            height={50}
            className="w-10 h-10 rounded-full border"
          />
          {isOpen && (
            <div>
              <p className="text-sm font-semibold">{user?.name|| "Guest"}</p>
              <p className="text-xs text-gray-500">{user?.role|| ""}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => signOut()}
          className={`text-sm rounded px-3 py-1 transition-colors ${
            isOpen ? "bg-red-500 text-white hover:bg-red-600" : "bg-red-500 text-white hover:bg-red-600"
          }`}
          aria-label="Sign out"
        >
          {isOpen ? "Sign Out" : "↥"}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
