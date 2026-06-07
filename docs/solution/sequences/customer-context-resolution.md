# Customer Context Resolution

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

    User->>Engine: Request customer-specific help or provide identifier
    Engine->>Session: Check existing customer context
    Session-->>Engine: Customer context missing

    Engine->>Engine: Extract known identifier patterns
    alt Identifier found by rule
        Engine->>Engine: Use extracted email, phone, account, policy, tracking, booking, or name value
    else No rule match
        Engine->>Gemini: Extract identifiers from message
        Gemini-->>Engine: Identifier candidates
    end

    Engine->>DB: Search configured customer fields
    DB-->>Engine: Matching customer records
    alt Exactly one candidate
        Engine->>Arize: Evaluate candidate as usable
        Arize-->>Engine: usable or other decision
        alt Usable
            Engine->>Session: Save customer ID and account ID
            Engine->>Session: Clear pending state and save turn
            Engine-->>User: Confirm context found and invite next step
        else Not usable
            Engine->>Gemini: Ask for one configured identifying detail
            Gemini-->>Engine: Identification question
        end
    else Zero or multiple candidates
        Engine->>Gemini: Ask for one configured identifying detail
        Gemini-->>Engine: Identification question
    end

    opt Identification question required
        Engine->>Arize: Evaluate question
        Arize-->>Engine: pass or retry
        alt Retry
            Engine->>Engine: Use fixed identifier fallback question
        end
        Engine->>Session: Save pending customer-context state and turn
        Engine-->>User: Ask for identifying detail
    end
```

Customer context resolution is separate from verification. Its purpose is to find one customer record using identifiers configured for the active profile.

The engine first extracts common identifier formats without Gemini. Gemini is used only when no deterministic identifier is found. Firestore search checks the profile's configured customer search fields.

Only one matching record is accepted. The session stores a small context object containing the customer ID and account ID, not the full Firestore customer record. Zero or multiple matches lead to another identifying question.

After a match, the engine currently returns a confirmation or a prompt to proceed. It does not automatically replay the original customer-specific request in the same turn.
