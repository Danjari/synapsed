import { Search } from "lucide-react";

export default function TopNav() {
  return (
    <nav className="glass rounded-2xl ml-0 mr-4 my-4 px-4 py-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-slate-800">Professor&apos;s Dashboard</h2>
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search"
            className="px-4 py-2 text-sm rounded-full glass-soft focus:ring-2 focus:ring-blue-300/60 outline-none"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
        </div>
      </div>
    </nav>
  );
}
