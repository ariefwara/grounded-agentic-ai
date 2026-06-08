# Protected Actions

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Engine
    participant Session as ADK Session
    participant Gemini
    participant DB as Firestore
    participant API as External API
    participant Arize

    User->>Engine: Confirm the proposed action
    Engine->>Session: Read identification and verification state

    alt Required customer access is incomplete
        Engine-->>Gemini: Identification or verification required
        Gemini-->>User: Ask for the next required detail
    else Confirmation is not explicit
        Engine-->>Gemini: Confirmation required
        Gemini-->>User: Summarize the action and ask for confirmation
    else Action is permitted
        alt Firestore action
            Engine->>DB: Execute transactional data change
            DB-->>Engine: Completed record and reference
        else External action
            Engine->>API: Execute configured operation
            API-->>Engine: External result
            Engine->>DB: Store local action reference
            DB-->>Engine: Stored record
        else Internal method
            Engine->>Engine: Run configured internal method
        end

        Engine->>Session: Store exact customer result message
        Engine->>Arize: Export action-result evaluation when enabled
        Engine-->>User: Return completed result and reference
    end
```

## Confirmation Rule

The action tool accepts explicit confirmation phrases such as “yes,” “confirm,” “go ahead,” “book it,” or “submit it.” An inquiry, preference, comparison, or ambiguous reply cannot execute an action.

## Access Rule

If the active profile protects customer data or actions, the tool checks session identification and verification state before execution. Gemini cannot bypass this check because it runs inside the engine-owned tool.

## Action Paths

Profiles currently support three execution paths:

1. A Firestore transaction that updates business data and creates a reference.
2. A configured external API operation, followed by a local action record.
3. An internal business method executed within the engine.

## Result Integrity

The action tool creates the customer-facing message from the actual execution result and stores it in session state. The ADK response callback consumes that message and returns it exactly. This prevents the model from adding unsupported promises about delivery, notifications, timing, or follow-up.

The runtime also contains a narrow fallback for confirmed actions when Gemini asks for confirmation again after all required access conditions have already been met. In that case, the engine executes the configured action directly and still formats the answer from the real result.
