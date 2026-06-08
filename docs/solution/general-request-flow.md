# Request Flow

This is the active path executed by `POST /chat`.

```mermaid
flowchart TD
    A[Web chat sends message and session ID] --> B[Express loads active engine runtime]
    B --> C[ADK loads or creates in-memory session]
    C --> D[Gemini receives profile instructions and conversation context]
    D --> E{Is a business capability needed?}

    E -->|No| F[Compose a customer-facing answer]
    E -->|Business context| G[Read profile capabilities and controls]
    E -->|Business information| H[Search Firestore records or documents]
    E -->|Customer-specific information| I[Identify and verify customer]
    E -->|External information| J[Call configured external service]
    E -->|Confirmed action| K[Execute configured business action]

    G --> D
    H --> D
    I --> D
    J --> D
    K --> L[Store exact action result in session state]
    L --> M[Return action result message]

    F --> N[Run response guardrail]
    N -->|Pass| O[Return answer]
    N -->|Internal language detected| P[Replace with customer-facing response]
    P --> O
    M --> O
    O --> Q[Web chat displays answer only]
```

## HTTP Contract

The frontend sends a message, optional request ID, session ID, and user context. The engine returns only:

```json
{
  "requestId": "generated-or-supplied-id",
  "answer": "customer-facing response"
}
```

Routing decisions, tool results, verification state, and evaluation details remain inside the engine.

## Agent Instruction

The ADK agent instruction is rendered from `engine/prompts/adk/customer-service-agent.prompt.md`. It combines the active profile with business controls and tells Gemini to guide proactively, retrieve facts through tools, stay within the business domain, compare meaningful options, and request explicit confirmation before actions.

## Tool Selection

The active agent can use these engine-owned capabilities:

- `get_business_context`
- `search_business_data`
- `search_business_documents`
- `identify_customer`
- `verify_customer`
- `execute_business_action`
- `query_external_service`, only when the profile declares an integration

The model selects a tool based on the conversation. The tool implementation remains authoritative for access and execution.

## Evaluation

Response and action evaluations always produce a local decision so the application remains usable without an external collector. When Arize/Phoenix is enabled, the same input, evidence, and decision are exported as evaluator traces for monitoring.
