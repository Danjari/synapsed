"use client";

import { useState } from "react";
import { UploadSection } from "./Upload/page";
import { ContentView } from "./contentView/page";

export default function ContentManagement({ classId }: { classId: string }) {
  // Use a key to force ContentView to refetch when it changes
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    // Increment key to trigger refetch in ContentView
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <UploadSection classId={classId} onUploadComplete={handleUploadComplete} />
      <ContentView key={refreshKey} classId={classId} />
    </div>
  );
}
