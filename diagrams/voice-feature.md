# Voice Feature — UML Sequence Diagram

## Full flow: WebRTC session → turn processing → audio response

```mermaid
sequenceDiagram
    actor Student
    participant VM as VoiceMode
    participant SESSION as POST /api/session
    participant OAI as OpenAI Realtime (gpt-realtime-2)
    participant VT as POST /api/voice-turn
    participant CACHE as voice-turn-store
    participant CONV as ConversationService
    participant SA as simple-agent (LangGraph)

    Note over VM: Component mounts → connect()

    VM->>VM: navigator.mediaDevices.getUserMedia({ audio: true })
    VM->>VM: new RTCPeerConnection()
    VM->>VM: pc.createDataChannel("oai-events")
    VM->>VM: pc.addTrack(microphoneTrack)
    VM->>VM: pc.createOffer() → SDP offer

    VM->>SESSION: POST /api/session (body: SDP offer, Content-Type: application/sdp)
    SESSION->>OAI: Forward SDP offer<br/>POST /v1/realtime/calls?model=gpt-realtime-2<br/>[ Authorization: Bearer OPENAI_API_KEY ]
    OAI-->>SESSION: SDP answer
    SESSION-->>VM: SDP answer (Content-Type: application/sdp)

    VM->>VM: pc.setRemoteDescription(sdpAnswer)
    Note over VM,OAI: WebRTC peer connection established<br/>Audio track streaming begins

    OAI-->>VM: DataChannel event: session.created
    VM->>OAI: session.update {<br/>  output_modalities: [audio],<br/>  turn_detection: { type: semantic_vad },<br/>  transcription: { model: gpt-4o-mini-transcribe },<br/>  voice: marin<br/>}
    Note over VM: State → listening

    loop Conversation turns

        Student->>OAI: Live audio (WebRTC track)
        OAI-->>VM: DataChannel: input_audio_buffer.speech_started
        Note over VM: Barge-in: interrupt ongoing response
        VM->>OAI: DataChannel: response.cancel
        Note over VM: State → listening

        OAI-->>VM: DataChannel: input_audio_buffer.speech_stopped
        Note over VM: State → thinking

        OAI-->>VM: DataChannel: conversation.item.done<br/>{ role: user, content: [{ type: input_audio, transcript }] }
        VM->>VM: queueVoiceTurn(transcript)<br/>turnId = "turn-{Date.now()}-{counter}"
        Note over VM: Turn chain: promises chained sequentially<br/>ensures turns are processed in order

        VM->>VT: POST /api/voice-turn<br/>{ transcript, turnId, threadId, classId, lessonId, userId }

        VT->>VT: pruneExpiredVoiceTurns() — evict TTL-expired entries
        VT->>CACHE: getCachedVoiceTurn(scope, turnId)
        CACHE-->>VT: null (first attempt)

        VT->>CONV: getOrCreateConversation({ userId, classId, lessonId, threadId })
        CONV-->>VT: conversation { id, threadId }

        VT->>SA: invokeAgent(transcript, agentThreadId, classId, userId, conversationId)
        Note over SA: Same LangGraph agent as text chat<br/>Full MongoDB-backed thread memory<br/>All tools available (including createVisualLesson)
        SA-->>VT: AgentResponse { content, diagramData, sources, inChatAssessmentData }

        VT->>CONV: saveMessage(USER, transcript)
        VT->>CONV: saveMessage(ASSISTANT, content)
        VT->>CACHE: setCachedVoiceTurn(scope, turnId, payload)<br/>TTL: 5 minutes
        Note over CACHE: Idempotency: retried requests with<br/>same turnId return cached payload

        VT-->>VM: { userText, assistantText, diagramData, threadId, conversationId }

        VM->>VM: threadIdRef.current = data.threadId
        VM->>VM: onTurn(payload) — update parent chat UI<br/>show diagram canvas if diagramData present
        Note over VM: State → speaking
        VM->>OAI: DataChannel: response.create {<br/>  modalities: [audio],<br/>  instructions: "Speak naturally: <assistantText>"<br/>}

        OAI-->>VM: DataChannel: response.output_audio.delta
        Note over VM: State → speaking
        OAI-->>Student: Synthesized audio response (WebRTC track)

        OAI-->>VM: DataChannel: response.done
        Note over VM: State → listening (if no pending turns)

    end

    Student->>VM: Clicks "End conversation"
    VM->>VM: closedRef.current = true
    VM->>VM: pc.close() — WebRTC teardown
```

---

## Agent state machine

```mermaid
stateDiagram-v2
    [*] --> idle : component mounts

    idle --> connecting : connect() called
    connecting --> listening : session.created + session.update sent
    connecting --> error : WebRTC / SDP failure

    listening --> listening : speech_started → response.cancel (barge-in)
    listening --> thinking : speech_stopped

    thinking --> thinking : POST /api/voice-turn in progress
    thinking --> speaking : voice-turn response received → response.create sent

    speaking --> listening : response.done (no pending turns)
    speaking --> thinking : speech_started (barge-in while speaking)

    error --> connecting : user clicks Retry

    listening --> [*] : End conversation
    speaking --> [*] : End conversation
```

---

## Architecture overview

```mermaid
flowchart TD
    STUDENT([Student speaks])

    STUDENT -->|audio| A1[Microphone captured\nby browser]
    A1 -->|WebRTC audio track| A2[OpenAI Realtime\ngpt-realtime-2\nVAD + transcription]

    A2 -->|speech detected| B1{Barge-in?}
    B1 -->|Yes — student interrupted| B2[DataChannel: response.cancel\nstop current audio]
    B2 --> A2
    B1 -->|No — turn complete| B3[DataChannel: conversation.item.done\ntranscript ready]

    B3 --> C1[VoiceMode queues turn\nturnId = turn-timestamp-counter]
    C1 -->|POST transcript + turnId\nthreadId · classId · userId| C2[POST /api/voice-turn]

    C2 --> D1{Cached?\nvoice-turn-store}
    D1 -->|Hit — same turnId retry| D2[Return cached payload\nTTL: 5 min]
    D1 -->|Miss| D3[ConversationService\nget or create conversation]

    D3 --> E1[simple-agent — LangGraph\nGemini + full thread memory\nMongoDB checkpointer]

    E1 -->|needs visual| E2[createVisualLesson\nHaiku planner → Opus + Excalidraw MCP]
    E1 -->|text response| E3[AgentResponse\ncontent · diagramData · sources]
    E2 --> E3

    E3 --> F1[Save to Prisma\nUSER message + ASSISTANT message]
    F1 --> F2[Cache response\nvoice-turn-store]
    F2 -->|assistantText + diagramData| G1[VoiceMode receives response]

    G1 -->|diagramData present| G2[Render ExcalidrawCanvas\nin chat UI]
    G1 --> G3[DataChannel: response.create\nSpeak: assistantText]

    G3 -->|audio synthesis| G4[OpenAI Realtime\ngenerates speech]
    G4 -->|WebRTC audio track| STUDENT2([🎓 Student hears response])

    style STUDENT fill:#d1fae5,stroke:#059669,color:#065f46
    style STUDENT2 fill:#d1fae5,stroke:#059669,color:#065f46
    style E2 fill:#ede9fe,stroke:#7c3aed
    style G2 fill:#ede9fe,stroke:#7c3aed
    style D1 fill:#fef9c3,stroke:#ca8a04
    style F2 fill:#fef9c3,stroke:#ca8a04
```
