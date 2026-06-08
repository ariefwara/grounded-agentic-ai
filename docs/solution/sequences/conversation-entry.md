# Conversation Entry

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Engine
    participant Gemini
    participant Session
    participant DB
    participant API
    participant Arize

    User->>Engine: POST /chat with message, session ID, and channel
    Engine->>Session: Load session by session ID
    alt Session exists
        Session-->>Engine: Recent turns, pending state, customer context, verification
    else New session
        Session-->>Engine: Empty session state
    end

    Engine->>Gemini: Run ADK agent with profile prompt and session context
    Gemini-->>Engine: Direct answer or requested business tool call
    opt Business tool requested
        Engine->>Engine: Execute configured DB, API, verification, or action tool
        Engine->>Session: Store tool state needed by the next turn
        Engine->>Gemini: Continue agent loop with tool result
    end
    Engine->>Arize: Evaluate final customer-facing answer
    Arize-->>Engine: pass, review, or local fallback decision
    Engine-->>User: Final answer only
```

The chat endpoint returns only `requestId` and `answer`; the frontend does not receive route, evaluation, or internal participant details.

Gemini now runs inside the ADK agent loop rather than a separate routing endpoint. The engine still owns the business tools and guardrails, so Gemini can request capability but cannot bypass configured data access, verification, or action-confirmation rules.
