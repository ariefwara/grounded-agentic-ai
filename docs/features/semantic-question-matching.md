# Semantic Question Matching

## The Problem: Words Are Not Meaning

When a user asks a question, they rarely use the exact wording the business expects. A customer might ask "Can I get my money back?" while the business has defined a canonical question called "Refund eligibility." These are the same request in business terms, but a keyword-based system would miss the connection.

The opposite problem is equally dangerous. Two questions can sound similar but carry completely different business meaning. "Am I eligible for a refund?" and "Can you guarantee my refund today?" both mention refunds, but the second asks for a commitment the business may not be able to make.

A system that matches only on keywords or exact text will either miss valid questions or treat different intents as the same.

## What Semantic Question Matching Does

Semantic question matching determines whether a user's request has the same meaning as a predefined canonical question or approved intent, regardless of how the user phrased it.

The business defines what questions the AI is allowed to answer. The user does not need to use the exact wording. If the meaning is equivalent, the system may treat it as the same question.

For example, a canonical question defined as "Refund eligibility" could match any of these user wordings:

- Can I get a refund?
- Can I get my money back?
- If I cancel, will the payment be returned?
- Am I eligible for a refund?

All of these carry the same business meaning: the user wants to know whether they qualify for a refund.

## When Meaning Changes

The system must also detect when the meaning changes, even if the topic is similar. Consider these two requests:

- "Am I eligible for a refund?"
- "Can you guarantee my refund today?"

The first asks about eligibility. The second asks for a commitment. These are not the same question in business terms, even though both involve refunds. The system must recognize that the second request carries a different intent and evaluate it differently.

## Why This Matters for Governance

Semantic question matching is not about making the AI understand users better. It is about enforcing boundaries.

If the system cannot match user wording to approved questions, it has two bad options:

1. **Match too loosely**: Treat every refund-related question as the same, including requests for commitments or exceptions that should not be handled automatically.
2. **Match too strictly**: Require exact wording, which frustrates users and misses valid questions that happen to be phrased differently.

Both options break the governance model. The first allows the AI to answer questions it should not. The second prevents the AI from answering questions it should.

## What Happens When There Is No Match

If the request does not match any approved question or intent, the system must not improvise. It cannot:

- Answer freely from general knowledge.
- Search for a workaround.
- Invent policy.
- Create a new denial wording outside configuration.

Instead, the system returns a configured standard response. The user gets a clear, controlled answer that does not pretend to understand a question the system was not designed to handle.

## Practical Consequence

Semantic question matching is what allows the system to say "yes, I understand this question" or "no, I cannot answer that" based on meaning rather than exact text. It is the gate that determines whether the rest of the governance process—retrieval, classification, eligibility checks, action execution—should even begin.

Without it, the system would either miss valid requests or answer questions it was never meant to handle. With it, the business controls exactly which questions the AI can engage with, while users can ask in their own words.
