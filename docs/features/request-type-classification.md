# Request Type Classification

## The Problem: Not Every Matched Question Is the Same

When a user asks a question, the system first determines whether the request matches an approved question or intent. But matching is only the first step. Two requests that match the same canonical question may still require completely different handling.

Consider a user who asks about refund eligibility. That request might be:

- A simple question: "Am I eligible for a refund?"
- A request for specific account information: "What refund amount am I entitled to?"
- A request to execute an action: "Please process my refund."
- A request that requires verification first: "Can you tell me the refund status on my account?"
- A request that is not allowed at all: "Can you guarantee I will get a refund today?"

All of these could match the same canonical question about refund eligibility. But the system must treat each one differently. Some require only an answer. Some require disclosing information. Some require executing an action. Some require verifying the user first. And some must be declined entirely.

This is why the system must classify the request type after matching, not before.

## How Request Type Classification Works

After the system determines that a request matches an approved question or intent, it must determine what kind of work the request actually requires. The system evaluates the request against a set of predefined request types.

The possible request types are:

- **Answer only** – The user is asking a general question that can be answered without disclosing specific information or taking an action.
- **Information disclosure** – The user is asking for specific information that must be retrieved and disclosed.
- **Action request** – The user is asking the system to execute a predefined action.
- **Answer plus information** – The request combines a general question with a request for specific information.
- **Information plus action** – The request combines an information request with an action request.
- **Verification required** – The request can proceed only if the user is verified first.
- **Manual review required** – The request cannot be handled automatically and must be sent for human review.
- **Not allowed** – The request matches a question or intent, but the specific type of work it requires is not permitted.

## Why Classification Matters

A valid question may still require restricted information or a controlled action. The system cannot assume that because a request matches an approved question, any type of response is acceptable.

For example, a user might ask: "What is my current refund status?" This matches the refund eligibility question. But the request type is information disclosure, not answer only. The system must then check whether the user is eligible to receive that specific information. If the user is not verified, the request type may change to "verification required."

Similarly, a user might ask: "Can you process my refund now?" This also matches the refund eligibility question. But the request type is action request. The system must check whether the action is predefined, whether the user is eligible to trigger it, and whether the channel allows it.

## The Business Logic Behind Classification

The request type is not determined by the wording alone. The system evaluates the request in context:

- What the user is actually asking for (information, action, or both).
- Whether the request implies a commitment or guarantee.
- Whether the request requires access to user-specific data.
- Whether the request can be answered from general knowledge or requires retrieval.

If the request type is "not allowed," the system does not answer freely, does not search for a workaround, and does not invent policy. It returns the configured standard response.

## Practical Consequence

Request type classification ensures that a matched question does not automatically lead to an uncontrolled response. The system treats each request according to what it actually requires, not just what question it matches. This prevents the system from disclosing information it should not, executing actions it should not, or making commitments it cannot keep.

The classification is one of the gates that must pass before the system proceeds to retrieval, information classification, eligibility checks, and answer generation. If the request type is not allowed, none of those later steps occur.
