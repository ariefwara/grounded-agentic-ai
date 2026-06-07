# Data Retrieval

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

    User->>Engine: Ask for options, status, policy, or other business data
    Engine->>Session: Load recent turns and customer context
    Session-->>Engine: Conversation context

    opt Profile requires identification before customer-specific data
        Engine->>Engine: Route to customer context resolution
    end

    Engine->>Engine: Expand short follow-up with up to three recent turns
    alt Profile fixes the source
        Engine->>Engine: Use profile data source
    else Rule identifies source
        Engine->>Engine: Select internal or external source by rule
    else Source remains unclear
        Engine->>Gemini: Select data source and topic
        Gemini-->>Engine: Source and topic
    end

    alt Internal source
        Engine->>DB: Query profile-scoped Firestore collections by topic
        DB-->>Engine: Matching evidence records
    else External source
        Engine->>API: Query external data without an integration ID
        API-->>Engine: Unavailable result with no records
    end

    alt No evidence
        Engine->>Gemini: Compose no-result recovery response
        Gemini-->>Engine: Recovery response
        Engine->>Arize: Evaluate recovery
        Arize-->>Engine: pass or retry
        Engine->>Session: Save pending clarification and turn
        Engine-->>User: Recovery response
    else Evidence found
        Engine->>Engine: Check evidence-answer cache and contextual direct answer
        alt Answer still needed
            Engine->>Gemini: Compose answer using evidence, profile guidance, and recent turns
            Gemini-->>Engine: Evidence-based answer
        end
        Engine->>Arize: Evaluate answer with evidence
        Arize-->>Engine: pass or retry
        alt Retry
            Engine->>Gemini: Regenerate using returned evidence only
            Gemini-->>Engine: Revised answer
        end
        Engine->>Engine: Cache answer by message and evidence
        Engine->>Session: Clear pending state and save turn
        Engine-->>User: Final data answer
    end
```

Short follow-up messages are expanded with recent conversation text before retrieval. This allows a message such as a preference, comparison request, or time choice to remain connected to earlier options.

Most current profiles set their data source in profile configuration, so source selection often skips Gemini. Internal retrieval searches configured Firestore collections and fields inside the active simulation namespace.

The external-data branch exists, but the current retrieval call does not pass an integration ID to the API adapter. The adapter therefore returns an unavailable result with no records, which continues into the no-evidence recovery path. External actions do pass their configured integration ID; external data retrieval does not yet do so.

With guided responses enabled, Gemini normally composes the customer-facing answer from the evidence, business offers, supported action, decision guidance, and recent turns. A small deterministic contextual answer exists for specific booking follow-ups.

Arize's local evidence evaluation passes when evidence is present. The trace contains the candidate and evidence when Phoenix/Arize is enabled.
