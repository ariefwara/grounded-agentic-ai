# Relevant Answer

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

    User->>Engine: Ask a profile-relevant question
    Engine->>Session: Load recent turns
    Session-->>Engine: Up to recent conversation context
    Engine->>Engine: Build profile-and-history cache key

    alt Cached answer exists
        Engine->>Engine: Reuse cached answer
    else No cached answer
        Engine->>Gemini: Answer using brand, domain, use case, offers, and recent turns
        Gemini-->>Engine: Concise relevant answer
        Engine->>Arize: Evaluate answer
        Arize-->>Engine: pass or retry
        alt Retry
            Engine->>Gemini: Regenerate with corrective instruction
            Gemini-->>Engine: Revised answer
        end
        Engine->>Engine: Cache answer
    end

    Engine->>Session: Clear pending state and save turn
    Engine-->>User: Final answer
```

This path is for a direct question that is relevant to the active business but does not require Firestore evidence, document excerpts, customer identification, verification, or an action.

The prompt receives the active profile and the latest four turns. The cache key also includes the profile and recent history, preventing a response from one profile or conversation context from being reused as another.

Arize's current local answer evaluation retries only when the candidate is empty or another configured local condition requests it. The retry is generated once before the turn is saved.
