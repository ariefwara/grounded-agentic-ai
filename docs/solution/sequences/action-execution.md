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

    User->>Engine: Explicitly confirm configured action
    Engine->>Session: Load ADK session state
    Session-->>Engine: Identification, verification, and prior tool state

    opt Profile requires identification and customer is unknown
        Engine->>Engine: Route to customer context resolution
        Engine-->>User: Ask for configured identifier
    end

    Engine->>Engine: Use configured profile action name, path, and integration

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

    Engine->>Session: Store last action and exact customer message
    Engine->>Gemini: Continue ADK agent loop
    Gemini-->>Engine: Model event after tool execution
    Engine->>Session: Read exact customer message from ADK state
    Engine->>Arize: Evaluate action result message
    Arize-->>Engine: pass or review trace
    Engine-->>User: Exact action result message
```

Action confirmation is enforced by the ADK business tool. The tool refuses execution unless the latest customer message contains explicit confirmation such as "yes," "confirm," "go ahead," or domain-specific confirmation wording. Before that point, the agent continues comparison, discovery, or confirmation.

For most business profiles, the action path is fixed in profile configuration. The supported paths are a Firestore data change, a configured external API call, or an internal Engine method.

The internal-data path runs a Firestore transaction that increments a configured counter and writes an action record. The returned record includes the generated reference and completion result.

The action tool checks identification and verification state before execution when the active profile requires protected customer context. After execution, the tool creates the customer-facing result message from the actual action result. The ADK response callback returns that message exactly so Gemini cannot add unsupported promises.
