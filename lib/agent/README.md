# Synapsed Agent

A simple agent built with LangGraph Functional API for the Synapsed educational platform.

## Structure

- **simple-agent.ts**: Main agent implementation using LangGraph's Functional API
  - Uses Gemini 2.0 Flash as the LLM
  - Includes three dummy tools for testing:
    - `getStudentProgress`: Get student progress in a class
    - `getClassResources`: Get available resources for a class
    - `getFlashcards`: Generate flashcards for a topic

## How It Works

The agent uses the LangGraph Functional API which allows you to write agent logic using standard control flow (loops, conditionals) instead of explicitly defining nodes and edges.

### Flow

1. **User sends a message** → The agent receives it as a `HumanMessage`
2. **LLM is called** → The model decides whether to use tools or respond directly
3. **Tools are executed** → If tools are called, they execute in parallel
4. **Loop repeats** → If tools were used, the LLM is called again with the results
5. **Final response** → When no more tools are needed, the final AI response is returned

## API Usage

### Import and use directly

```typescript
import { invokeAgent } from '@/lib/agent/simple-agent';

const response = await invokeAgent('What is the progress of student123 in class456?');
console.log(response);
```

### Via HTTP API

```bash
curl -X POST http://localhost:3000/api/agent-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

## Testing

Run the test script:

```bash
node test-simple-agent.js
```

## Adding More Tools

To add more tools, simply define them using the `tool()` function:

```typescript
const myNewTool = tool(
  ({ param1 }: { param1: string }) => {
    // Your implementation
    return `Result for ${param1}`;
  },
  {
    name: "myNewTool",
    description: "What this tool does",
    schema: z.object({
      param1: z.string().describe("Parameter description"),
    }),
  }
);
```

Then add it to the `toolsByName` map and the `tools` array.

## Next Steps

- Replace dummy tool implementations with real database queries
- Add authentication/authorization to tools
- Add conversation memory/persistence
- Add more sophisticated routing logic
- Add streaming responses
