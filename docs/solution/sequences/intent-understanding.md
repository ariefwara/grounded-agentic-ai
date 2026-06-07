# Conversation Routing

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

    User->>Engine: Send current message
    Engine->>Session: Read pending state and recent turns
    Session-->>Engine: Conversation context
    Engine->>Engine: Apply deterministic rules

    alt Cancel or direct pending verification answer
        Engine->>Engine: Select route immediately
    else Clear lookup, greeting, context, verification, or action confirmation
        Engine->>Engine: Select fast route
    else Ambiguous or unsupported-looking message
        Engine->>Gemini: Interpret message with active profile and session
        Gemini-->>Engine: Intent, role, and entities
        Engine->>Engine: Normalize to allowed intent
    end

    opt Pending state exists and message is not a direct verification answer
        Engine->>Gemini: Classify continue, correction, intent change, or cancel
        Gemini-->>Engine: Conversation control decision
        alt Intent change
            Engine->>Session: Clear old pending state
        else Correction or continuation
            Engine->>Engine: Preserve pending flow with merged entities
        else Cancel
            Engine->>Engine: Route to cancellation
        end
    end

    Engine->>Arize: Evaluate final classification
    Arize-->>Engine: usable or review
    Engine->>Engine: Dispatch selected handler or ask clarification
```

Deterministic routing recognizes current pending verification answers, greetings, configured action confirmations, contextual follow-ups, domain-relevant direct questions, document requests, action verbs, customer identifiers, and common retrieval topics.

Gemini is used when those rules are not sufficient. Its output is constrained to the engine's allowed intents. The engine then applies one additional rule: a configured action must be explicitly confirmed; otherwise the message remains in the information and decision phase.

Arize receives the normalized interpretation. Its current runtime classification result is local. Phoenix/Arize tracing is optional and does not become a separate synchronous decision maker.
