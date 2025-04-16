import { uploadToMistral } from '@/lib/ocr/uploadToMistral';
import { getOcrMarkdown } from '@/lib/ocr/getOcrMardown';
import { embedAndStore } from '@/lib/pinecone/embedAndStore';
import { chunkMarkdownByPage } from '@/lib/chunking/chunkMarkdown';

export async function POST(req: Request) {
    try {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) return Response.json({ error: 'No file provided' }, { status: 400 });
  
      const uploadRes = await uploadToMistral(file);
      const markdown = await getOcrMarkdown(uploadRes.id);
      const chunks = await chunkMarkdownByPage(markdown);
      await embedAndStore(chunks, "default");
  
      return Response.json({ status: 'success', chunks });
    } catch (err: unknown) {
      console.error('Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return Response.json({ error: errorMessage }, { status: 500 });
    }
  }
  
  
  
  //await embedAndStore(chunks, /* metadata */);

