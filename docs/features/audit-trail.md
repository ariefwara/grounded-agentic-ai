# Audit Trail

## Why an Audit Trail Matters

When an AI system decides what to answer, what information to disclose, and what actions to take, the organization needs to know why each decision was made. Without an audit trail, there is no way to investigate a complaint, verify that governance rules were followed, or improve the system when something goes wrong.

An audit trail is not optional. It is the record that makes governance verifiable.

## What the Audit Trail Captures

The system records every important decision across the full journey of a user request. This includes:

### Request and Context

- The original user request, exactly as received.
- The channel the user came from (web chat, email, WhatsApp, etc.).
- Context signals available at the time (session metadata, email address, phone number, account references, previous conversation context).
- The identity or context confidence state (anonymous, unknown, partially identified, verified customer, etc.).

### Matching and Understanding

- The canonical question or intent that the request matched.
- The match confidence and the reason it was considered a match.
- If the request did not match, that decision is recorded as well.

### Retrieval and Query Decisions

- Whether retrieval or a database query was needed.
- Which documents or data sources were selected.
- Which documents or data were actually retrieved.
- The reason each source was chosen or excluded.

### Information Classification

- The classification of the information needed (public, customer-specific, confidential, non-disclosable, etc.).
- Whether the information was allowed for this user and channel.

### Eligibility Checks

- The user eligibility result for the requested information.
- The user eligibility result for any requested action.
- The criteria that were checked (identity confidence, role, account ownership, verification state, etc.).

### Action Decisions

- Whether an action was requested.
- Which predefined action matched.
- The action eligibility result.
- Whether the action was executed or denied.

### Answer and Gate Results

- The approved or default answer that was selected.
- Any draft answers that were generated.
- The result of each gate check on intermediate outputs and the final answer:
    - Scope decision.
    - Retrieval decision.
    - Query decision.
    - Retrieved information use.
    - Draft answer.
    - Tool or action call.
    - Standard response selection.
    - Retry output.
    - Final answer.
- The semantic answer equivalence result (whether the final wording matched the approved meaning).
- The style check result.
- The disclosure check result.

### Retry and Drop History

- If an intermediate or final response failed a gate, the system records:
    - Which gate failed.
    - Whether a retry was attempted.
    - How many retries were made.
    - Whether the response was dropped.
    - Whether a standard response was used instead.

### Final Decision

The audit trail ends with the final decision, which can be:

- **Sent** – The answer was delivered to the user.
- **Blocked** – The response was dropped and not sent.
- **Standard response** – A configured fallback was used.
- **Verification required** – The system asked for additional verification.
- **Manual review required** – The request was routed to a human.
- **Action executed** – The action was performed.
- **Action denied** – The action was refused.

## What the Audit Trail Enables

With a complete audit trail, the organization can:

- Investigate why a specific answer was given to a specific user.
- Verify that governance rules were applied correctly at every step.
- Identify patterns where the system is too restrictive or too permissive.
- Improve matching, classification, or eligibility rules based on real decisions.
- Demonstrate compliance with internal policy or regulatory requirements.

## What the Audit Trail Is Not

The audit trail is not a conversation log. It is a decision log. It captures why the system did what it did, not only what the system said.

The audit trail is also not a debugging tool for developers only. It is a governance record that business owners, compliance teams, and support teams can use to understand and improve the system's behavior.
