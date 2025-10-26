# Synapsed Agent - Quick Start

## Overview

A simple agent built from scratch using LangGraph's Functional API for the Synapsed educational platform. This replaces all previous complex agent implementations with a clean, minimal approach based on the official LangGraph quickstart.

## What Was Deleted

All old agent-related files were removed:
- `app/api/agent-chat/route.ts` (old version)
- `lib/agent/conversation-service.ts`
- `lib/agent/enhanced-state.ts`
- `lib/agent/enhanced-tutor-agent.ts`
- `lib/agent/orchestrator.ts`
- `lib/agent/routing.ts`
- `lib/agent/tools.ts`
- `lib/agent/tutor-agent.ts`
- `lib/agent/workers.ts`
- `test-agent-simple.js`
- `test-enhanced-agent.js`

## What Was Created

### 1. `lib/agent/simple-agent.ts`
Main agent implementation using LangGraph Functional API:

**Features:**
- Uses Gemini 2.0 Flash as the LLM
- Three dummy tools for testing:
  - `getStudentProgress`: Get student progress in a class
  - `getClassResources`: Get available resources for a class
  - `getFlashcards`: Generate flashcards for a topic
- Simple loop-based control flow (no complex state machines)
- Tool calling with automatic parallel execution

**Key Components:**
- `callLlm`: Task to call the LLM
- `callTool`: Task to execute tools
- `agent`: Main entrypoint using Functional API
- `invokeAgent`: Helper function to invoke the agent

### 2. `app/api/agent-chat/route.ts`
Simple REST API endpoint:
```typescript
POST /api/agent-chat
Body: { "message": "user message here" }
Response: { "response": "agent response" }
```

### 3. `test-simple-agent.js`
Test script to verify agent functionality

### 4. `lib/agent/README.md`
Documentation explaining:
- How the agent works
- How to add new tools
- API usage examples
- Next steps for development

## How It Works

The agent uses LangGraph's Functional API, which allows writing agent logic using standard control flow instead of explicitly defining nodes and edges.

### Flow:
1. User sends message → received as `HumanMessage`
2. LLM decides → use tools or respond directly
3. Tools execute → in parallel if multiple calls
4. Loop continues → if tools used, LLM called again with results
5. Final response → when no more tools needed

## Usage

### Via API:
```bash
curl -X POST http://localhost:3000/api/agent-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the progress of student123 in class456?"}'
```

### Import Directly:
```typescript
import { invokeAgent } from '@/lib/agent/simple-agent';

const response = await invokeAgent('Hello!');
console.log(response);
```

## Adding New Tools

1. Define the tool:
```typescript
const myTool = tool(
  ({ param }: { param: string }) => {
    // Implementation
    return `Result: ${param}`;
  },
  {
    name: "myTool",
    description: "Tool description",
    schema: z.object({
      param: z.string().describe("Parameter description"),
    }),
  }
);
```

2. Add to `toolsByName` map:
```typescript
const toolsByName = {
  // ... existing tools
  [myTool.name]: myTool,
};
```

3. Add to tools array:
```typescript
const tools = Object.values(toolsByName);
```

## Known Issues

There's a dependency conflict with Zod v4 in your project. The agent should still work at runtime, but TypeScript compilation may show errors. To fix:
- Either downgrade to Zod v3
- Or wait for LangGraph to support Zod v4

## Next Steps

- [ ] Replace dummy tool implementations with real database queries
- [ ] Add authentication/authorization to tools
- [ ] Add conversation memory/persistence using LangGraph checkpointing
- [ ] Add streaming responses for real-time updates
- [ ] Add more sophisticated error handling
- [ ] Add logging and monitoring

## Architecture Benefits

**Simpler:**
- One file vs 9+ files
- Functional API vs complex state machines
- Standard TypeScript/JavaScript control flow

**More Maintainable:**
- Easy to understand
- Easy to debug
- Easy to extend

**Follows Best Practices:**
- Based on official LangGraph quickstart
- Uses latest LangGraph patterns
- Minimal dependencies

## Files Created

```
lib/agent/
  ├── simple-agent.ts      # Main agent implementation
  └── README.md            # Detailed documentation

app/api/agent-chat/
  └── route.ts             # API endpoint

test-simple-agent.js       # Test script

AGENT_QUICKSTART.md        # This file
```
