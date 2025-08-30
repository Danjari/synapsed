"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, FileText, CheckCircle, Settings } from "lucide-react";
import type { ComponentType } from "react";

type IconType = ComponentType<{ className?: string }>;

export type SidebarItem = {
  name: string;
  icon: IconType;
  path?: string;
  id?: string;
};

const defaultMenuItems: SidebarItem[] = [
  { name: "Dashboard", path: "/teacher/dashboard", icon: Home },
  { name: "Classes", path: "/teacher/classes", icon: Users },
  { name: "Surveys", path: "/teacher/surveys", icon: FileText },
  { name: "Pathways", path: "/teacher/pathways", icon: CheckCircle },
  { name: "Students", path: "/teacher/students", icon: Users },
  { name: "Settings", path: "/teacher/settings", icon: Settings },
];

export default function Sidebar({
  items,
  activeId,
  onSelect,
}: {
  items?: SidebarItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
}) {
  const pathname = usePathname();
  const menuItems = items ?? defaultMenuItems;

  return (
    <aside className="w-64 bg-white shadow-md p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-6">SynapsEd.</h2>
      <ul className="space-y-3">
        {menuItems.map(({ name, path, icon: Icon, id }) => (
          <li key={path ?? id ?? name}>
            {onSelect && id ? (
              <button
                type="button"
                onClick={() => onSelect(id)}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 ${
                  activeId === id ? "bg-gray-200 font-semibold" : ""
                }`}
              >
                <Icon className="h-5 w-5" />
                {name}
              </button>
            ) : (
              <Link
                href={path ?? "#"}
                className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 ${
                  pathname === path ? "bg-gray-200 font-semibold" : ""
                }`}
              >
                <Icon className="h-5 w-5" />
                {name}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
