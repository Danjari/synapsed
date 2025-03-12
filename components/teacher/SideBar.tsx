"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, FileText, CheckCircle, Settings } from "lucide-react";

const menuItems = [
  { name: "Dashboard", path: "/teacher/dashboard", icon: Home },
  { name: "Classes", path: "/teacher/classes", icon: Users },
  { name: "Surveys", path: "/teacher/surveys", icon: FileText },
  { name: "Pathways", path: "/teacher/pathways", icon: CheckCircle },
  { name: "Students", path: "/teacher/students", icon: Users },
  { name: "Settings", path: "/teacher/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white shadow-md p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-6">SynapsEd.</h2>
      <ul className="space-y-3">
        {menuItems.map(({ name, path, icon: Icon }) => (
          <li key={path}>
            <Link
              href={path}
              className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 ${
                pathname === path ? "bg-gray-200 font-semibold" : ""
              }`}
            >
              <Icon className="h-5 w-5" />
              {name}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}