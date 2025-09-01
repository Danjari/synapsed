"use client"
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, BookOpen, MessageSquare, Award, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { User } from "next-auth";
import { signOut } from "next-auth/react";
import { Role } from "@prisma/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type UserWithRole = User & {
  role?: Role;
}

const Sidebar = ({ user }: { user?: UserWithRole }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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
    <TooltipProvider>
      <>
      <aside
        className={`glass relative h-[calc(100dvh-2rem)] fixed top-4 left-4 p-4 transition-[width] duration-300 ease-in-out z-40 ${
          isOpen ? "w-[50px]" : "w-[50px]"
        }`}
      >
        {/* Collapse toggle anchored to the sidebar itself */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-2 p-2 rounded-full bg-white/70 hover:bg-white shadow-sm transition-all duration-300 ease-in-out"
          aria-label="Toggle sidebar"
        >
          {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>

        <div className="flex justify-between items-center pb-2 pr-10">
          <h1
            className={`text-xl font-semibold text-gray-800 transition-opacity ${
              isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            SynapsEd.
          </h1>
        </div>

        <nav className="mt-4 space-y-2">
          {menuItems.map((item) => {
            const active = pathname === item.path;
            const Node = (
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-[20px] cursor-pointer transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(20,69,47,0.15)] ${
                  active ? "bg-white/50 font-semibold text-slate-900" : "hover:bg-white/40 text-slate-700"
                }`}
              >
                {item.icon}
                {isOpen && <span className="font-medium truncate">{item.name}</span>}
              </div>
            );
            return (
              <Tooltip key={item.name} delayDuration={0}>
                <TooltipTrigger asChild>
                  <div onClick={() => router.push(item.path)}>{Node}</div>
                </TooltipTrigger>
                {!isOpen && <TooltipContent side="right">{item.name}</TooltipContent>}
              </Tooltip>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image
              src={user?.image || "/logo.svg"}
              alt="User Avatar"
              width={50}
              height={50}
              className="w-10 h-10 rounded-full border border-white/40 backdrop-blur-[8px]"
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
            className="text-sm rounded-[14px] px-3 py-1 bg-[#14452F] text-white shadow-[0_8px_20px_rgba(20,69,47,0.25)] hover:shadow-[0_10px_24px_rgba(20,69,47,0.35)] transition-all duration-300 ease-in-out hover:-translate-y-0.5 active:scale-95"
            aria-label="Sign out"
          >
            {isOpen ? "Sign Out" : ""}
          </button>
        </div>
      </aside>
      {/* Flow spacer to prevent content overlap on desktop */}
      <div
        className="shrink-0 mr-1"
        style={{ width: "50px" }}
        aria-hidden
      />
      </>
    </TooltipProvider>
  );
};

export default Sidebar;


