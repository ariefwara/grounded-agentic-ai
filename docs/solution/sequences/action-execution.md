# Action Execution

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

    User->>Engine: Explicitly confirm or request configured action
    Engine->>Session: Load customer context and recent conversation
    Session-->>Engine: Context, verification status, and prior turns

    opt Profile requires identification and customer is unknown
        Engine->>Engine: Route to customer context resolution
        Engine-->>User: Ask for configured identifier
    end

    alt Profile defines action path
        Engine->>Engine: Use profile action name, path, and integration
    else Rule identifies path
        Engine->>Engine: Select internal data, external API, or internal method
    else Path remains unclear
        Engine->>Gemini: Select action path
        Gemini-->>Engine: Action name and path
    end

    alt Internal data action
        Engine->>DB: Execute transactional data change
        DB-->>Engine: Completed record with generated reference
    else External API action
        Engine->>API: Call configured action operation
        API-->>Engine: External action result or unavailable result
    else Internal method
        Engine->>Engine: Run internal method
        Engine-->>Engine: Internal method result
    end

    Engine->>Gemini: Compose result using action result and latest six turns
    Gemini-->>Engine: Customer-facing action result
    Engine->>Arize: Evaluate response against action result
    Arize-->>Engine: pass or retry
    alt Retry
        Engine->>Engine: Use deterministic action-result fallback
    end
    Engine->>Session: Clear pending state and save completed turn
    Engine-->>User: Final action result
```

The current action confirmation is conversational rather than a dedicated pending-confirmation state. Routing recognizes explicit confirmation phrases such as "yes," "confirm," "go ahead," or domain-specific confirmation wording. Before that point, a Gemini action classification is converted to data retrieval so the assistant can continue comparison or discovery.

For most business profiles, the action path is fixed in profile configuration. The supported paths are a Firestore data change, a configured external API call, or an internal Engine method.

The internal-data path runs a Firestore transaction that increments a configured counter and writes an action record. The returned record includes the generated reference and completion result.

The result prompt receives the actual execution result and the latest six turns, allowing the final message to repeat a previously selected option, location, or schedule when that context is present.

The current action handler checks customer identification when the profile defines identifying fields. It does not independently enforce the session verification status before execution; verification is triggered earlier by routing for protected topics.
