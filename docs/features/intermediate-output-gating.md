# Intermediate Output Gating

## The Problem: Governance Must Apply at Every Step

Most AI systems check only the final answer. The system retrieves documents, drafts a response, and then—at the last moment—evaluates whether the answer is safe to send. This approach has a critical flaw: intermediate outputs can cause harm before the final check occurs.

Consider what happens when an AI system retrieves a document it should not have accessed. Even if the final answer is blocked, the retrieval itself may have exposed sensitive data to logs, monitoring systems, or downstream processes. A draft answer that contains restricted information may be shown to a human reviewer before the final gate catches it. A tool call that executes an unauthorized action cannot be undone by blocking the response.

For business-critical AI communication, governance cannot be a single checkpoint at the end. Every step of the response journey must be evaluated before it is allowed to continue.

## What Intermediate Output Gating Means

Intermediate output gating means the system applies governance checks to every important step in the response process, not only to the final answer. Each intermediate output—a retrieval decision, a query, a draft, a tool call, a retry attempt—must pass its own gate before the system proceeds to the next step.

The system gates these intermediate outputs:

- **Scope decision**: Whether the question or intent is allowed.
- **Retrieval decision**: Whether the system is permitted to retrieve the identified documents.
- **Query decision**: Whether the system is permitted to run the identified query.
- **Retrieved information use**: Whether the retrieved information can be used in the current context.
- **Draft answer**: Whether the draft is compliant before it is refined or sent.
- **Tool or action call**: Whether the action is authorized before execution.
- **Standard response selection**: Whether the fallback response is appropriate.
- **Retry output**: Whether a regenerated response is safe to use.
- **Final answer**: Whether the complete response is safe to send.

Each of these outputs can leak information, cause wrong actions, or create compliance issues. They must be evaluated before they are passed forward, shown to a user, used by another agent step, or used to execute an action.

## How Gating Works in Practice

When an intermediate output is produced, the system evaluates it against the relevant governance rules. If the output passes, it proceeds to the next step. If it fails, the system takes one of these actions:

- **Drop the response**: The output is discarded and not used.
- **Retry**: The system provides failure feedback to the generator and attempts to produce a new output, within a configured limit.
- **Return a standard response**: If retries are exhausted or not allowed, the system falls back to a configured standard response.

The system does not send a failed intermediate output to the user. It does not use a failed output as context for later steps unless explicitly marked as failed. This prevents cascading errors where one bad intermediate output contaminates subsequent processing.

## Why Intermediate Outputs Need Separate Gates

Different intermediate outputs carry different risks. A retrieval decision that accesses the wrong document set may violate data access policies. A draft answer that adds an unsupported commitment may create legal liability. A tool call that executes an action without authorization may cause operational damage.

Each gate is designed for the specific risk of that step:

- **Retrieval and query gates** ensure the system accesses only approved data sources for the matched question or intent.
- **Information classification gates** ensure retrieved information is not used in channels or contexts where it is not permitted.
- **Draft answer gates** ensure the wording stays within the approved answer boundary before any further processing.
- **Action gates** ensure the action is predefined, classified correctly, and eligible for the current user before execution.
- **Retry gates** ensure that regenerated outputs do not repeat the same violation.

## The Relationship Between Intermediate and Final Gates

Intermediate output gating does not replace the final answer gate. The final gate remains necessary because even when every intermediate step passes, the assembled final answer may still violate rules. A draft that was safe in isolation may become unsafe when combined with other information. A style that was acceptable for one audience may not be acceptable for another.

The system therefore gates both intermediate and final outputs. Each gate is a separate check, and all gates must pass before the answer is sent.

## Practical Consequence

Intermediate output gating means the system does not trust any output until it has been evaluated. A retrieval that looks relevant is not automatically used. A draft that sounds correct is not automatically sent. A tool call that is technically possible is not automatically executed.

Every step is governed. Every output is checked. The system only proceeds when the current step has passed its gate. This prevents intermediate outputs from causing harm even when the final answer would have been caught.
