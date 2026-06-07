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

    Engine->>Engine: Build deterministic interpretation
    alt Fast route is allowed
        Engine->>Engine: Use deterministic intent, role, and entities
    else Gemini routing is required
        Engine->>Gemini: Classify message using channel, profile, and session
        Gemini-->>Engine: Intent, role, and extracted entities
        Engine->>Engine: Normalize result and prevent premature action routing
    end

    Engine->>Arize: Evaluate classification locally and export trace when enabled
    Arize-->>Engine: usable or review
    alt Review
        Engine->>Gemini: Compose one clarification question
        Gemini-->>Engine: Clarification question
        Engine->>Session: Save pending clarification and turn
        Engine-->>User: Clarification question
    else Usable
        Engine->>Engine: Continue to pending-state or intent handler
    end
```

The chat endpoint returns only `requestId` and `answer`; the frontend does not receive route, evaluation, or internal participant details.

The fast route is used only when the deterministic interpretation is considered sufficient. If a pending state exists, most messages still go through control-message inspection, except direct answers to pending verification.

When Gemini labels a message as an action but the message is not an explicit configured confirmation, the engine changes the route to data retrieval. This keeps comparison and exploration separate from execution.
