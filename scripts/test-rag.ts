import { searchClassContent } from "../lib/agent/tools/searchClassContent";
import * as fs from "fs";
import * as path from "path";

// Manually load .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach((line) => {
        const [key, ...value] = line.split("=");
        if (key && value) {
            process.env[key.trim()] = value.join("=").trim().replace(/^["']|["']$/g, "");
        }
    });
}

async function testRagTool() {
    console.log("Testing searchClassContent tool...");

    const mockInput = {
        query: "test query",
        classId: "test-class-id",
    };

    // We are not mocking queryPinecone here, so this will attempt a real call.
    // If Pinecone is not reachable or the index doesn't exist, it might fail.
    // However, we can at least verify the tool handles the call.

    try {
        const result = await searchClassContent.invoke(mockInput);
        console.log("Tool Result:", result);
    } catch (error) {
        console.error("Tool Execution Failed:", error);
    }
}

testRagTool();
