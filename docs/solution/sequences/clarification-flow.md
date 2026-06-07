# Clarification Flow

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

    User->>Engine: Send unclear message
    Engine->>Arize: Evaluate classification as review
    Arize-->>Engine: review
    Engine->>Gemini: Ask for the smallest missing detail
    Gemini-->>Engine: One clarification question
    Engine->>Arize: Evaluate clarification text
    Arize-->>Engine: pass or retry
    alt Retry
        Engine->>Engine: Use fixed clarification fallback
    end
    Engine->>Session: Save original message, reason, and clarification turn
    Engine-->>User: Clarification question

    User->>Engine: Provide clarification
    Engine->>Session: Load pending clarification
    Session-->>Engine: Original message and reason
    Engine->>Gemini: Merge original message with clarification
    Gemini-->>Engine: Merged request text
    Engine->>Session: Clear pending clarification and store merged topic
    Engine->>Engine: Continue current dispatch logic
```

The engine asks only one clarification question and stores the original message in the pending state.

On the next turn, Gemini merges the clarification with the original message. The current implementation stores that merged text in `collectedSlots.topic` and clears the pending state. It does not restart routing from the beginning with the merged text, so this page intentionally does not claim that the merged request is immediately fulfilled in the same turn.
