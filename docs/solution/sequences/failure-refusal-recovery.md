# Unsupported Request and Recovery

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

    alt Request is classified as unsupported
        User->>Engine: Ask outside active business support
        Engine->>Gemini: Compose unsupported response
        Gemini-->>Engine: Limitation response
        Engine->>Arize: Evaluate unsupported response
        Arize-->>Engine: pass or retry
        alt Retry
            Engine->>Engine: Use fixed unsupported fallback
        end
        Engine->>Session: Clear pending state and save turn
        Engine-->>User: Unsupported response
    else Retrieval returns no evidence
        User->>Engine: Ask for business data or document
        Engine->>DB: Query configured records
        DB-->>Engine: No matching evidence
        Engine->>Gemini: Compose recovery response
        Gemini-->>Engine: No-result response with optional detail request
        Engine->>Arize: Evaluate recovery response
        Arize-->>Engine: pass or retry
        alt Retry
            Engine->>Engine: Use fixed no-result fallback
        end
        Engine->>Session: Save pending clarification and turn
        Engine-->>User: Recovery response
    else API or downstream operation throws
        User->>Engine: Trigger request using failing dependency
        Engine->>API: Call external operation
        API--xEngine: Error
        Engine-->>User: HTTP 500 internal error response
    end
```

The active failure handler has two conversational modes: `unsupported` and `not_found`.

Unsupported requests receive a Gemini-written limitation message. A no-result retrieval receives a recovery message and creates a pending clarification so the next user message can add another detail.

Both responses are evaluated locally through Arize. An empty or rejected candidate is replaced with a fixed fallback.

There is not yet a dedicated conversational recovery branch for thrown Firestore, API, or Gemini errors. Uncaught errors reach the Express error middleware and return an HTTP 500 JSON error. This diagram shows that current limitation rather than a planned graceful fallback.
