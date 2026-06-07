# Customer Verification

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

    User->>Engine: Ask for protected customer-specific service
    Engine->>Session: Check customer context and verification state
    Session-->>Engine: Customer known but not verified
    Engine->>DB: Load customer reference by customer ID
    DB-->>Engine: Configured customer reference record

    alt Customer reference missing
        Engine->>Engine: Return to customer context resolution
    else Customer reference found
        alt Profile has fixed verification question
            Engine->>Engine: Use configured question
        else No fixed question
            Engine->>Gemini: Compose question from configured reference categories
            Gemini-->>Engine: Verification question
        end
        Engine->>Arize: Evaluate verification question
        Arize-->>Engine: pass or retry
        alt Retry
            Engine->>Engine: Use fixed address fallback question
        end
        Engine->>Session: Save customer ID, fields, and minimum match count
        Engine-->>User: Ask verification question
    end

    User->>Engine: Provide verification answer
    Engine->>Session: Load pending verification
    Session-->>Engine: Customer ID, fields, and minimum matches
    Engine->>DB: Reload customer reference
    DB-->>Engine: Reference values
    Engine->>Gemini: Identify reference need
    Gemini-->>Engine: Suggested reference categories
    Engine->>Gemini: Compare answer with selected reference values
    Gemini-->>Engine: Structured match explanation
    Engine->>Engine: Recalculate exact matches locally
    Engine->>Arize: Evaluate local pass or fail decision
    Arize-->>Engine: pass or fail

    alt Pass
        Engine->>Session: Save passed verification and clear pending state
        Engine-->>User: Verification passed, request may continue
    else Fail
        Engine->>Session: Save failed verification and clear pending state
        Engine-->>User: Verification could not be completed
    end
```

Verification begins only after customer context exists and the active profile requires verification for the topic. Some profiles provide a fixed question; otherwise Gemini composes one from configured reference categories.

The engine currently calls Gemini to identify the reference need, but that result is not used to select the fields. The pending state's configured verification fields remain authoritative.

Gemini then compares the answer, but the final boolean is overwritten by a deterministic local count of reference values found in the normalized user answer. The configured `minimumMatches` controls the threshold.

The result is stored in the in-memory session. A passed result prevents the profile's verification trigger from asking again during that session.

The current implementation returns a verification result message. It does not automatically resume the protected retrieval or action in the same turn; the user or simulator continues with the next message.
