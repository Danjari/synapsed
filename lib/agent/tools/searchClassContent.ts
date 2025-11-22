import { DynamicStructuredTool } from "@langchain/core/tools";
import * as z from "zod";
import { queryPinecone } from "@/lib/pinecone/queryPinecone";

export const searchClassContent = new DynamicStructuredTool({
  name: "searchClassContent",
  description: "Search for information within the class content (documents, syllabus, etc.) using RAG. Use this tool when the user asks questions about the class material.",
  schema: z.object({
    query: z.string().describe("The search query to find relevant information"),
    classId: z.string().describe("The ID of the class to search in"),
  }),
  func: async (input) => {
    const { query, classId } = input as { query: string; classId: string };

    try {
      const namespace = `class_${classId}`;
      const matches = await queryPinecone(query, namespace);

      console.log(`🔍 RAG Search for "${query}" in ${namespace}`);
      console.log(`📊 Found ${matches.length} matches`);

      if (!matches || matches.length === 0) {
        console.log("❌ No matches found");
        return "No relevant information found in the class content.";
      }

      // Log details for verification
      matches.forEach((match, i) => {
        console.log(`\n[Match ${i + 1}] Score: ${match.score}`);
        console.log(`Metadata:`, match.metadata);
        console.log(`Content Preview: ${match.metadata?.text?.toString().substring(0, 100)}...`);
      });

      // Format the results for the agent
      const formattedResults = matches.map((match) => {
        const metadata = match.metadata as any;
        return `
Source: ${metadata.title || "Unknown Source"} (Page ${metadata.page || "?"})
Content: ${metadata.text}
`;
      }).join("\n---\n");

      return `Found the following relevant information:\n${formattedResults}`;
    } catch (error) {
      console.error("Error searching class content:", error);
      return "An error occurred while searching the class content.";
    }
  },
});
