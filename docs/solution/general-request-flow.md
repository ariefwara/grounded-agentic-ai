# Current Conversation Flow

This flow represents the conversation logic currently executed by the chat endpoint. It follows a session across multiple messages rather than treating each message independently.

```mermaid
flowchart TD
    A([User sends message]) --> B[Load or create in-memory session]
    B --> C[Build deterministic interpretation]
    C --> D{Fast route allowed?}
    D -->|No| E[Ask Gemini to classify intent and role]
    D -->|Yes| F[Use deterministic interpretation]
    E --> G[Run local classification evaluation and export trace when enabled]
    F --> G

    G --> H{Classification usable?}
    H -->|No| I[Ask one clarification question]
    I --> J[Save pending clarification]
    J --> Z([Return answer])

    H -->|Yes| K{Cancel command?}
    K -->|Yes| L[Clear pending request and collected slots]
    L --> Z
    K -->|No| M{Pending state exists?}

    M -->|Clarification| N[Merge answer with original request and clear pending state]
    M -->|Customer context| O[Search customer using supplied identifier]
    M -->|Verification| P[Compare answer with configured customer reference fields]
    M -->|No pending state| Q{Selected intent}

    N --> Q
    O -->|One match| R[Save customer context in session]
    O -->|No single match| S[Ask for one configured identifier]
    S --> T[Save pending customer context]
    T --> Z
    R --> Z

    P -->|Pass| U[Save passed verification]
    P -->|Fail| V[Save failed verification]
    U --> Z
    V --> Z

    Q -->|Small talk| W[Return profile welcome and available assistance]
    Q -->|Relevant answer| X[Generate profile-relevant answer]
    Q -->|Customer context| O
    Q -->|Verification| Y[Load customer reference and ask verification question]
    Q -->|Data retrieval| AA[Retrieve internal or external evidence]
    Q -->|Document retrieval| AB[Retrieve matching document records]
    Q -->|Action| AC[Execute configured action path]
    Q -->|Unsupported| AD[Generate unsupported response]
    Q -->|Anything else| I

    Y --> AE[Save pending verification]
    AE --> Z

    AA -->|No evidence| AF[Generate recovery response and save pending clarification]
    AA -->|Evidence found| AG[Compose answer from evidence and evaluate]
    AB -->|No evidence| AF
    AB -->|Evidence found| AH[Compose answer from excerpts and evaluate]

    AC --> AI[Compose result response and evaluate]

    W --> AJ[Save conversation turn]
    X --> AJ
    AD --> AJ
    AF --> AJ
    AG --> AJ
    AH --> AJ
    AI --> AJ
    AJ --> Z
```

The engine first loads the session, which currently lives in the engine process. The session contains recent turns, one pending state, collected slots, resolved customer context, and verification status.

Routing starts with deterministic rules. Cancellation, direct pending verification answers, greetings, configured action confirmations, obvious lookups, and other clear intents can avoid a Gemini routing call. Ambiguous messages are classified by Gemini using the current profile and session.

Pending customer context and verification states take priority over new fulfillment work. A request may also be redirected to customer identification before retrieval when the active profile requires identity for customer-specific data.

The active fulfillment paths are profile welcome, relevant answer, customer context resolution, verification, data retrieval, document retrieval, action execution, unsupported response, and clarification. Every returned message is stored as a conversation turn. Only the latest 20 turns are retained.

The current clarification merge stores a merged request topic and clears the pending clarification. It does not yet rerun the whole turn from the beginning. Slot-filling utilities exist in the engine, but the current router does not create a slot-filling pending state, so slot filling is not presented as an active Solution flow.
