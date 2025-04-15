import { queryPinecone } from "@/lib/pinecone/queryPinecone";

export async function POST(req: Request) {
  const { query } = await req.json();
  const matches = await queryPinecone(query);
  return Response.json({ matches });
}
