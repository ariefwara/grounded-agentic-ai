# Request Understanding

## The Problem: Words Are Not Enough

When a user types a message, the system cannot simply look for keywords. Two users can say the same words but mean different things. One user asks "Can I get a refund?" and means a general policy question. Another user asks the same words but means "Can you guarantee my refund today?" — a request for a commitment.

A keyword-based system would treat both the same. A grounded system must understand the difference.

## What the System Needs to Determine

When a user sends a request, the system must determine:

- **What the user is asking.** Is this a question about policy, a request for specific information, or a request to execute an action?
- **What information the user wants.** Does the user want general policy information, or do they want their personal account details?
- **Whether the request is ambiguous.** Does the sentence have multiple possible meanings?
- **Whether the request matches a predefined question or intent.** The business has defined what questions the AI is allowed to answer. The user's words may differ from the canonical wording, but the meaning must be the same.
- **Whether the request changes meaning.** A request that sounds similar but asks for a commitment, exception, or private information is not the same request.

## Semantic Matching, Not Keyword Matching

The business defines canonical questions. For example:

> Refund eligibility

Users may ask this in many ways:

- "Can I get a refund?"
- "Can I get my money back?"
- "If I cancel, will the payment be returned?"
- "Am I eligible for a refund?"

All of these can map to the same canonical question if the business meaning is equivalent. The system must recognize that different wording can carry the same meaning.

But the system must also detect when the meaning changes. Consider:

- "Am I eligible for a refund?" — a question about policy.
- "Can you guarantee my refund today?" — a request for a personal commitment.

These are not the same. The second request asks for something the business may not allow the AI to promise. The system must treat it differently.

## Request Types

After matching, the system determines what type of work the request requires:

- **Answer only.** The user wants a factual answer from approved content.
- **Information disclosure.** The user wants specific information that may be restricted.
- **Action request.** The user wants the system to do something, such as process a refund or update an account.
- **Answer plus information.** The user wants both a policy answer and their personal data.
- **Information plus action.** The user wants information and then wants an action taken.
- **Verification required.** The request needs the user to prove their identity first.
- **Manual review required.** The request is too complex or sensitive for the AI to handle.
- **Not allowed.** The request does not match any approved question or intent.

This distinction matters because a valid question may still require restricted information or a controlled action. The system must know what kind of work is needed before it can proceed.

## What Happens When the Request Does Not Match

If the request does not match an approved question or intent, the system must not improvise. It must:

- Not answer freely from model knowledge.
- Not search for a workaround.
- Not invent policy.
- Not create a new denial wording outside configuration.
- Return the configured standard response.

The system is not a general chatbot. It can only answer questions the business has approved.

## Why This Matters

Request understanding is the first gate in the system. If the system misunderstands what the user wants, every subsequent step — retrieval, classification, eligibility, action — will be wrong.

By understanding the request type and matching it to approved meanings, the system ensures that it only proceeds with work the business has authorized. It does not guess, improvise, or treat similar-sounding requests as the same when their business meaning differs.
