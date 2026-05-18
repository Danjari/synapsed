# Visual Diagram Feature — UML Sequence Diagram

## Full flow: from student request to Excalidraw canvas

```mermaid
sequenceDiagram
    actor Student
    participant UI as ChatSection
    participant API as POST /api/agent-chat
    participant CONV as ConversationService
    participant SA as simple-agent (LangGraph)
    participant HIST as diagramHistoryByThread
    participant VL as createVisualLesson
    participant HAIKU as Claude Haiku (Planner)
    participant OPUS as Claude Opus + Excalidraw MCP
    participant CANVAS as ExcalidrawCanvas

    Student->>UI: Requests visual explanation
    Note over UI: Appends [Mode: VISUAL_WHITEBOARD]<br/>to message when visual mode is active

    UI->>API: POST { messages, threadId, classId, userId }
    API->>CONV: getOrCreateConversation({ userId, threadId, classId, lessonId })
    CONV-->>API: conversation { id, threadId }

    API->>SA: invokeAgent(userMessage, agentThreadId, classId, userId, conversationId)
    Note over SA: Sets currentToolContext<br/>{ threadId, classId, userId, conversationId }

    SA->>SA: LangGraph: callLlm node
    SA->>HAIKU: [SystemPrompt + visual prompt] + thread history + user message
    Note over HAIKU: Full thread memory loaded<br/>from MongoDB checkpointer

    HAIKU-->>SA: AIMessage — tool_call: createVisualLesson<br/>{ question, learningGoal, conversationContext }
    Note over HAIKU: conversationContext contains:<br/>topicsCovered, studentUnderstanding,<br/>priorExplanations, studentLevel

    SA->>SA: LangGraph: callTools node
    SA->>HIST: get(threadId) → previousDiagramSummaries
    HIST-->>SA: [ teachingBrief_1, teachingBrief_2, ... ] (up to 3)
    Note over SA: Server injects previousDiagramSummaries<br/>into tool args — Gemini does not set this

    SA->>VL: invoke({ question, conversationContext, previousDiagramSummaries })

    Note over VL: Step 1 — Planning
    VL->>HAIKU: planningPrompt (question + student context + prior diagram summaries)
    Note over HAIKU: Designs whiteboard layout:<br/>step count, spatial arrangement,<br/>color conventions, canvas size
    HAIKU-->>VL: teachingBrief (layout plan text)

    Note over VL: Step 2 — Drawing
    VL->>OPUS: question + teachingBrief<br/>[ beta: mcp-client-2025-11-20 ]
    Note over OPUS: Calls Excalidraw MCP tool:<br/>create_view({ elements: [...] })<br/>Returns mcp_tool_use block
    OPUS-->>VL: response content blocks<br/>{ mcp_tool_use: create_view, text: hook sentence }

    VL->>VL: parseExcalidrawDataFromContent()<br/>Extracts elements, filters cameraUpdate,<br/>derives scrollX/scrollY from camera
    VL-->>SA: { content, diagramData, diagramManifest: teachingBrief }

    SA->>HIST: push diagramManifest for threadId<br/>shift oldest if length > 3
    Note over HIST: Teaching brief stored as manifest —<br/>describes what was drawn so the next<br/>diagram can maintain visual continuity

    SA->>SA: LangGraph: callLlm node (final pass)
    SA->>HAIKU: ToolMessage(content) — clean text, no JSON
    HAIKU-->>SA: AIMessage — short explanation referencing the visual

    SA-->>API: AgentResponse { content, diagramData, sources }
    API->>CONV: saveMessage(USER) + saveMessage(ASSISTANT)
    API-->>UI: { response, diagramData, threadId, conversationId }

    UI->>CANVAS: render(diagramData.elements, diagramData.appState)
    CANVAS-->>Student: Interactive Excalidraw whiteboard
```

---

## Context orchestration layer

```mermaid
flowchart TD
    A([Student request]) --> B[Gemini<br/>full thread memory via MongoDB]

    B -->|synthesizes| C[conversationContext\ntopicsCovered, studentUnderstanding,\npriorExplanations, studentLevel]
    D[(diagramHistoryByThread\nper-thread teaching briefs)] -->|server-injected| E[previousDiagramSummaries]

    C --> F[createVisualLesson]
    E --> F

    F --> G[Claude Haiku — Planner\nbuilds layout-aware teaching brief]
    G --> H[Claude Opus + Excalidraw MCP\ndraws the whiteboard]
    H --> I([diagramData → canvas])

    H -->|teachingBrief stored as manifest| D

    style D fill:#fef9c3,stroke:#ca8a04
    style C fill:#dbeafe,stroke:#2563eb
    style E fill:#fef9c3,stroke:#ca8a04
```
