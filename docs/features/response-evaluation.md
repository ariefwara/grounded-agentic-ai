# Response Evaluation

## The Problem: Not Every Answer Is Safe to Send

An AI can generate a response that sounds correct but should not be delivered. The wording might be right, but the answer might disclose information the user should not see, make a commitment the organization cannot keep, or use a style that does not match the channel. A response can pass every earlier check and still fail at the final moment.

This is why Grounded Agentic AI evaluates every response before it is sent. The system does not assume that a generated answer is safe. It checks the answer against the same rules that governed every earlier step.

## What Response Evaluation Checks

Before an answer reaches the user, the system verifies six categories of safety:

### Support

The answer must be supported by the retrieved documents or query results. The system checks whether every claim in the answer can be traced back to an approved source. If the AI adds a statement that is not in the retrieved information, the answer fails this check.

### Style

The answer must use the correct style for the channel, audience, and request type. A formal policy document should not be reworded as casual chat. A customer support answer should not sound like a legal notice unless that is the configured style. The system checks whether the wording matches the approved style boundary.

### Classification

The information in the answer must match its classification. If the retrieved information is classified as customer-specific, the answer must not contain employee-only details. If the information is classified as non-disclosable, the answer must not include it at all. The system checks whether the answer respects the classification rules that were applied to the source information.

### Eligibility

The user who will receive the answer must be eligible for every piece of information in the answer. If the answer contains account-specific details, the user must be the account owner or an authorized party. If the answer contains role-restricted information, the user must have that role. The system checks whether the user's identity confidence and verification state match the eligibility requirements of the disclosed information.

### Commitments

The answer must not contain unauthorized commitments. A commitment is any statement that promises a specific outcome, timeline, exception, or action that is not in the approved answer boundary. The system checks whether the answer adds a promise that was not configured. Even if the rest of the answer is correct, an unauthorized commitment causes the response to fail.

### Disclosure Safety

The answer must be safe to disclose on the current channel. Some information may be allowed for the user but not allowed on a public or unencrypted channel. Some information may require verification that has not been completed. The system checks whether the combination of user, channel, and information is permitted.

## When Evaluation Happens

Response evaluation is not only a final-output check. The system evaluates every important intermediate output:

- Draft answers before they are used as context for further steps.
- Tool or action call outputs before they are passed to the next agent step.
- Retry outputs before they are shown to the user.
- Standard response selections before they are sent.

Intermediate outputs can leak information or cause wrong actions. They must be evaluated before they are passed forward, shown to a user, used by another agent step, or used to execute an action.

## What Happens When a Response Fails

If an answer or intermediate response fails any of the six checks, the system does not send it. The system has three options:

1. **Drop the response.** The failed output is discarded and not used anywhere.
2. **Retry.** The system provides failure feedback to the generator and attempts a new response within the configured retry limit.
3. **Return a standard response.** If retries are exhausted or not allowed, the system returns the configured standard response for that situation.

The system never sends a failed response to the user. It never uses a failed intermediate output as context for later steps unless explicitly marked as failed.

## Why This Matters

Response evaluation is the final gate before the user sees anything. Every earlier check—identity resolution, semantic matching, retrieval, classification, eligibility, action control—exists to make sure the right information reaches the right user. But those checks happen before the answer is written. Response evaluation catches problems that appear only when the AI assembles the final wording.

A response can pass every earlier check and still fail because:

- The AI reworded the answer in a way that changed the meaning.
- The AI added an example that disclosed restricted information.
- The AI used a style that is not approved for this channel.
- The AI made a commitment that was not in the approved answer.

Response evaluation ensures that the final answer is not only correct in content but also safe to send.
