# Current System Interactions

The Solution pages document the interactions currently executed by the chat endpoint.

Every sequence uses the same boundaries:

- **User** sends a message and receives only the final customer-facing answer.
- **Engine** hosts the Google ADK runner, profile rules, business tools, data access, external integrations, and action execution.
- **Gemini** interprets ambiguous language, generates structured decisions, and composes customer-facing wording.
- **Session** is currently managed by the ADK in-memory session service inside the engine process. It is not stored in Firestore.
- **DB** is profile-scoped business data stored in Firestore.
- **API** represents a configured external integration.
- **Arize** performs the local runtime evaluation and exports an evaluator trace to Phoenix/Arize when enabled. The engine does not wait for a later online score.

Internal methods remain Engine-to-Engine calls and are not separate participants.

## Active Pages

- Conversation Entry
- Conversation Routing
- Relevant Answer
- Clarification Flow
- Customer Context Resolution
- Eligibility / Verification
- Data Retrieval
- Document Retrieval
- Action Execution
- Correction / Intent Change / Cancel
- Failure / Recovery

The diagrams describe business-level interactions across the active ADK chat path. Detailed internal classes, prompt rendering, and method calls are intentionally folded into the Engine boundary unless they cross to Gemini, Session, DB, API, or Arize.
