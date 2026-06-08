# Conversation Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Chat as Web Chat
    participant Engine
    participant Session as ADK Session
    participant Gemini
    participant DB as Firestore
    participant API as External API
    participant Arize

    User->>Chat: Send a customer message
    Chat->>Engine: POST /chat with message and session ID
    Engine->>Session: Get or create session
    Session-->>Engine: Profile and conversation state
    Engine->>Gemini: Run ADK agent with profile instructions

    loop Until Gemini returns a final response
        alt Business data is needed
            Gemini->>Engine: Request business-data tool
            Engine->>DB: Search profile-scoped records
            DB-->>Engine: Matching records
            Engine-->>Gemini: Tool result
        else Customer identification or verification is needed
            Gemini->>Engine: Request identity tool
            Engine->>DB: Compare supplied customer details
            DB-->>Engine: Match result
            Engine->>Session: Store identification or verification state
            Engine-->>Gemini: Tool result without private reference values
        else External information is needed
            Gemini->>Engine: Request configured integration
            Engine->>API: Query external service
            API-->>Engine: External result
            Engine-->>Gemini: Tool result
        else No tool is needed
            Gemini-->>Engine: Customer-facing response
        end
    end

    Engine->>Arize: Export response evaluation when enabled
    Engine-->>Chat: requestId and answer
    Chat-->>User: Display answer
```

## Multi-Turn State

The same session ID reconnects later messages to the ADK session. Tools update only the state needed for later turns, such as the matched customer ID, verification result, or latest action result.

## Customer Identification

Identification is profile-specific. Public discovery flows may need no identity at all. Protected profiles expose configured identifier fields to the agent. The identity tool accepts only values supplied by the customer and requires exactly one matching Firestore customer record.

## Customer Verification

Verification compares customer-supplied private answers with selected reference values. The tool returns match counts and pass/fail status but never returns the stored reference values to Gemini or the customer. The profile defines which reference categories are used and how many matches are required.

## Customer-Facing Boundary

The frontend never needs to know which tool ran, why access was denied, or which evaluation decision was produced. It receives the answer only, keeping the chat interface independent from engine internals.
