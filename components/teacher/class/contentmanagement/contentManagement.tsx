import { UploadSection } from "./Upload/page";
import { ContentManagement } from "./contentView/page";

export default function Page({ classId }: { classId: string }) {
  const refreshFiles = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <UploadSection classId={classId} onUploadComplete={refreshFiles} />
      <ContentManagement classId={classId} />
    </div>
  );
}
