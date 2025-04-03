"use client"
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, BookOpen, MessageSquare, Award, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";


const Sidebar = () => {
  const { data: session } = useSession();
  const user = session?.user;
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
    </aside>
  );
};

export default Sidebar;

// 'use client'

// import { useState } from "react"
// import { usePathname, useRouter } from "next/navigation"
// import {
//   Home,
//   BookOpen,
//   MessageSquare,
//   Award,
//   Settings,
//   ChevronLeft,
//   ChevronRight,
// } from "lucide-react"
// import Image from "next/image"
// import {
//   Sidebar,
//   SidebarContent,
//   SidebarGroup,
//   SidebarGroupContent,
//   SidebarGroupLabel,
//   SidebarMenu,
//   SidebarMenuButton,
//   SidebarMenuItem,
// } from "@/components/ui/sidebar"
// import { cn } from "@/lib/utils"

// const items = [
//   { title: "Home", path: "/", icon: Home },
//   { title: "My Courses", path: "/courses", icon: BookOpen },
//   { title: "Feedback", path: "/feedback", icon: MessageSquare },
//   { title: "Test", path: "/test", icon: Award },
//   { title: "Achievements", path: "/achievements", icon: Award },
//   { title: "Certificate", path: "/certificate", icon: Award },
//   { title: "Settings", path: "/settings", icon: Settings },
// ]

// export default function AppSidebar() {
//   const [isOpen, setIsOpen] = useState(true)
//   const pathname = usePathname()
//   const router = useRouter()

//   return (
//     <Sidebar collapsible={!isOpen ? "icon" : "none"} className="h-screen border-r">
//       <SidebarContent>
//         {/* Toggle Button */}
//         <div className="flex justify-between items-center px-4 py-4 border-b">
//           <h1 className={cn("text-xl font-semibold transition-all", !isOpen && "opacity-0 hidden")}>
//             SynapsEd.
//           </h1>
//           <button
//             onClick={() => setIsOpen((prev) => !prev)}
//             className="p-2 rounded hover:bg-muted"
//           >
//             {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
//           </button>
//         </div>

//         {/* Menu */}
//         <SidebarGroup>
//           <SidebarGroupLabel className={cn("pl-4 text-sm text-muted-foreground", !isOpen && "hidden")}>
//             Navigation
//           </SidebarGroupLabel>
//           <SidebarGroupContent>
//             <SidebarMenu>
//               {items.map((item) => {
//                 const Icon = item.icon
//                 const isActive = pathname === item.path

//                 return (
//                   <SidebarMenuItem key={item.title}>
//                     <SidebarMenuButton
//                       onClick={() => router.push(item.path)}
//                       className="w-full flex items-center space-x-2"
//                       isActive={isActive}
//                     >
//                       <Icon size={18} />
//                       {isOpen && <span>{item.title}</span>}
//                     </SidebarMenuButton>
//                   </SidebarMenuItem>
//                 )
//               })}
//             </SidebarMenu>
//           </SidebarGroupContent>
//         </SidebarGroup>
//       </SidebarContent>

//       {/* Profile Section */}
//       <div className="flex items-center space-x-3 px-4 py-4 border-t">
//         <Image
//           src="/logo.svg"
//           alt="Avatar"
//           width={40}
//           height={40}
//           className="rounded-full border"
//         />
//         {isOpen && (
//           <div>
//             <p className="text-sm font-semibold">Bob</p>
//             <p className="text-xs text-muted-foreground">Premium Account</p>
//           </div>
//         )}
//       </div>
//     </Sidebar>
//   )
// }