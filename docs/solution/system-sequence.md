# Current System Interactions

The Solution pages document the interactions currently executed by the chat endpoint.

Every sequence uses the same boundaries:

- **User** sends a message and receives only the final customer-facing answer.
- **Engine** owns routing, session transitions, profile rules, retrieval selection, fallback decisions, and action execution.
- **Gemini** interprets ambiguous language, generates structured decisions, and composes customer-facing wording.
- **Session** is currently an in-memory store inside the engine process. It is not stored in Firestore.
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

The diagrams show current behavior, including local fallbacks and current limitations. They do not describe planned policy checks or orchestration steps that are not yet connected to the chat flow.
