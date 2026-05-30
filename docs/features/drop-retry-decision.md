# Drop, Retry, or Standard Response

## The Problem: Not Every Output Is Safe to Send

When an AI system generates a response, the result is not always correct, compliant, or safe. The wording may drift from the approved meaning. The AI may include an unsupported claim. It may disclose information the user is not eligible to receive. It may promise an action it cannot execute.

If the system sends every generated response without checking it, the organization loses control over what the AI communicates. A single bad output can cause regulatory exposure, customer confusion, or unauthorized commitments.

The system needs a mechanism to catch failures before they reach the user—and decide what to do when a failure occurs.

## What This Feature Does

The drop, retry, or standard response feature is the system's failure handling mechanism. It applies whenever an answer or intermediate output fails a governance gate.

A gate is a check that evaluates whether a response is allowed to proceed. Gates exist at multiple points in the journey, not only at the final answer. An intermediate output—such as a retrieved document, a draft answer, or a tool call—can also fail a gate.

When a gate fails, the system does not simply send the output anyway. Instead, it follows a defined decision path:

1. **Drop the response.** The failed output is not sent to the user. It is not used as context for later steps unless explicitly marked as failed. The system stops that output from going further.

2. **Retry if allowed.** If the system is configured to allow retries, it provides failure feedback to the generator and attempts to produce a new output. This retry happens within a configured limit. The system does not retry indefinitely.

3. **Return a standard response.** If the retry limit is reached, or if retries are not allowed for this gate, the system falls back to a configured standard response. This is a pre-approved, safe message that does not disclose information, make commitments, or execute actions.

## Where Gates Apply

Gates are not only for the final answer. The system evaluates every important response step before it is passed forward, shown to a user, used by another agent step, or used to execute an action.

Gates apply to:

- Scope decisions.
- Retrieval decisions.
- Query decisions.
- Retrieved information use.
- Draft answers.
- Tool or action calls.
- Standard response selection.
- Retry outputs.
- Final answers.

Each of these steps can leak information or cause wrong actions if not checked. The drop, retry, or standard response mechanism ensures that a failure at any step is handled consistently.

## Why Dropping Matters

Dropping a failed response prevents the user from seeing an incorrect or unsafe output. It also prevents that output from contaminating later steps. If a draft answer contains a restricted piece of information, dropping it means that information never reaches the user or the next processing stage.

The system does not send partial or failed outputs. It does not use them as context unless they are explicitly marked as failed. This prevents cascading errors where one bad output influences the next.

## Why Retrying Matters

Retrying gives the system a chance to correct a failure without immediately falling back to a standard response. The generator receives feedback about what went wrong and can attempt to produce a compliant output.

Retries are limited. The organization configures how many retries are allowed. This prevents infinite loops and ensures the system does not keep trying indefinitely when a request cannot be answered within the boundaries.

## Why a Standard Response Matters

When retries fail or are not allowed, the system must still respond to the user. It cannot stay silent or send a partial output. The standard response is a safe, pre-configured message that does not disclose information, make commitments, or execute actions.

The standard response is not improvised. It is defined by the organization and follows the same governance rules as any other answer. It may be a simple message such as "I cannot answer that question" or a channel-specific fallback.

## How It Fits in the Journey

The drop, retry, or standard response mechanism is the last safety net before an output reaches the user. It is not the first line of defense—that is the matching, classification, eligibility, and answer selection steps. But even after those steps pass, the generated output can still fail a gate.

When it does, the system does not guess. It does not send the output anyway. It follows the defined path: drop, retry, or standard response.

## Practical Meaning

This feature means the organization does not have to trust every generated output. It can define gates at multiple points, configure retry behavior, and set safe fallback responses. The system will not send a response unless it passes every required gate. If it fails, the system handles it predictably—not by hoping the output is good enough, but by following a defined failure path.
