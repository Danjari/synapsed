


// /app/test-upload/page.tsx
'use client';
import { useState } from 'react';

interface Chunk {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export default function TestUploadPage() {
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    const res = await fetch('/api/rag', {
      method: 'POST',
      body: formData,
    });

    const json = await res.json();
    setChunks(json.chunks);
    setLoading(false);
  };

  return (
    <div className="p-4">
      <input type="file" onChange={handleUpload} />
      {loading && <p>Processing...</p>}
      <pre className="text-xs overflow-auto max-h-[500px]">
        {JSON.stringify(chunks, null, 2)}
      </pre>
    </div>
  );
}

