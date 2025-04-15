// /lib/embedding/embedAndStore.ts
import { Pinecone } from '@pinecone-database/pinecone';


type Chunk = {
  text: string;
  metadata: {
    page: number;
    lines: { from: number; to: number };
    
  };
};

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

export async function embedAndStore(
  chunks: Chunk[],
  namespace = 'default'
) {
  const data = chunks.map((chunk, i) => ({
    id: `chunk-${i}`,
    text: chunk.text,
    metadata: chunk.metadata,
  }));

  const model = 'llama-text-embed-v2';

  // Generate embeddings using Pinecone Inference API
  console.time("Embeddings")
  const embeddings = await pinecone.inference.embed(
    model,
    data.map(d => d.text),
    { inputType: 'passage', truncate: 'END' }
  );
  console.timeEnd("Embeddings")



  // Prepare vectors
  const vectors = data.map((d, i) => {
    const emb = embeddings.data[i];
  
    if (emb.vectorType !== "dense") {
      throw new Error(`Expected dense embedding but got: ${emb.vectorType}`);
    }
  
    return {
      id: d.id,
      values: emb.values, 
      metadata: { 
        text: d.text,
        page: d.metadata.page,
        lineStart: d.metadata.lines.from,
        lineEnd: d.metadata.lines.to,
       }
    };
  });


console.log("🟢 Final vectors to upsert:", vectors.length);
console.log("🟢 Vector sample ID:", vectors[0]?.id);
console.log("🟢 Metadata sample:", vectors[0]?.metadata);
console.log("🟢 Namespace:", namespace);
console.log("🟢 Index Name:", process.env.PINECONE_INDEX_NAME);

  

  // Upsert vectors
  console.time("Upsert")
  await index.namespace(namespace).upsert(vectors);
  console.timeEnd("Upsert")

  const verify = await index.namespace(namespace).fetch(vectors.slice(0, 5).map(v => v.id));
console.log("🧐 Fetched back:", verify);

}


