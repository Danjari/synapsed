import { Bell, Search } from "lucide-react";
import AuthButton from "../AuthButtons";

export default function TopNav() {
  return (
    <nav className="bg-white shadow flex items-center justify-between p-4">
      <h2 className="text-lg font-semibold">Professor&apos;s Dashboard</h2>
      <div className="flex items-center gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search"
            className="border rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-400"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        </div>
        <button className="relative p-2 rounded-full bg-gray-100 hover:bg-gray-200">
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1">2</span>
        </button>
        <AuthButton/>
      </div>
    </nav>
  );
}