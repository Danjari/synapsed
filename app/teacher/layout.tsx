import type React from "react";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ambient-teacher">
      {children}
    </div>
  );
}
