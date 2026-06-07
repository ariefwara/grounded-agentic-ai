# Document Retrieval

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

    User->>Engine: Ask for a document, guide, file, or instructions
    Engine->>Session: Load current session
    Session-->>Engine: Customer context and recent turns

    opt Profile requires identification before retrieval
        Engine->>Engine: Route to customer context resolution
    end

    alt Message explicitly names a document
        Engine->>Engine: Derive document topic by rule
    else Scope is not explicit
        Engine->>Gemini: Identify document lookup topic
        Gemini-->>Engine: Document topic
    end

    Engine->>DB: Search configured document collection
    DB-->>Engine: Matching document records
    alt No document evidence
        Engine->>Gemini: Compose no-result recovery response
        Gemini-->>Engine: Recovery response
        Engine->>Arize: Evaluate recovery
        Arize-->>Engine: pass or retry
        Engine->>Session: Save pending clarification and turn
        Engine-->>User: Recovery response
    else Documents found
        Engine->>Engine: Check evidence-answer cache
        alt No cached or direct answer
            Engine->>Gemini: Answer from selected excerpts and profile context
            Gemini-->>Engine: Document-based answer
        end
        Engine->>Arize: Evaluate answer with document evidence
        Arize-->>Engine: pass or retry
        alt Retry
            Engine->>Gemini: Regenerate from excerpts only
            Gemini-->>Engine: Revised answer
        end
        Engine->>Engine: Cache answer by request and evidence
        Engine->>Session: Clear pending state and save turn
        Engine-->>User: Final document answer
    end
```

Documents are stored as records in the profile's Firestore namespace; there is no separate document-management application in the current architecture.

An explicit document message uses a deterministic topic rule. Otherwise Gemini supplies the lookup topic. The DB performs token matching across the configured document search fields.

Guided profiles use Gemini to compose the answer from excerpts. The response is evaluated with the retrieved records and retried once when the local decision requests it.
