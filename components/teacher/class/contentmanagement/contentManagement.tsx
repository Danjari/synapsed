import { UploadSection } from "./Upload/page";
import { ContentView } from "./contentView/page";

export default function ContentManagement({ classId }: { classId: string }) {
  const refreshFiles = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <UploadSection classId={classId} onUploadComplete={refreshFiles} />
      <ContentView classId={classId} />
    </div>
  );
}
