# Grounded Agentic AI

## Overview

Grounded Agentic AI is an approval gate for sensitive AI-generated business responses. It prevents unsupported, off-policy, or wrongly phrased answers from being sent by tracing, evaluating, dropping, and retrying responses before delivery.

Unlike a normal customer support chatbot, Grounded Agentic AI is designed for situations where the answer must be correct, source-backed, and phrased according to approved business rules before it reaches a customer, employee, partner, or public audience.

The agent uses Gemini, Google Cloud, and Arize to generate controlled responses, evaluate them against approved sources, keep audit traces, and retry failed outputs until the response is ready to send.

## Core Problem

Companies want AI to help with communication, but they cannot allow AI to freely answer sensitive questions with unsupported claims, risky wording, or inconsistent policy interpretation.

For high-stakes business communication, the question is not only:

> Does the answer sound helpful?

The real question is:

> Is this answer allowed to be sent?

Grounded Agentic AI treats every generated response as a candidate that must pass evidence, policy, and style checks before delivery.

## Example Use Case: Verified Support

One primary use case is Verified Support: customer support responses that must be checked against approved support policies, product documentation, refund rules, incident notes, and response style guidelines before they are sent.

Other possible use cases include:

- Employee policy answers.
- Incident customer updates.
- Sales or RFP responses.
- Security questionnaire responses.
- Partner and vendor communication.
- Public statement review.

## Core Rule

The AI may only answer with:

- Questions that are allowed by the configured response scope.
- Claims explicitly supported by approved documents.
- Response styles explicitly allowed by configuration.
- Wording patterns that match the intended audience and channel.
- Outputs that pass automated review before delivery.

The system must also decide which questions should be answered and which questions should not be answered. If a question is outside the approved scope, the AI must not improvise; it must return a configured standard response.

If the generated response does not comply, the system must drop it and retry. Supervision happens through audit logs and evaluation traces, not constant manual human review.

## How It Works

1. A user requests a customer-facing or employee-facing answer.
2. The agent checks whether the question is allowed to be answered.
3. If the question is outside scope, the system returns the configured standard response.
4. If the question is allowed, the agent retrieves approved source documents and configuration rules.
5. Gemini drafts a response using only the allowed content and style.
6. Arize traces the request, source context, generated answer, and evaluation result.
7. Evaluators check whether the answer is grounded, compliant, and written in the approved style.
8. If the answer fails, it is dropped and regenerated.
9. If the answer passes, the system returns an audit-ready response.

## Technology

- Gemini for answer generation and review loops.
- Google Cloud for deployment and runtime services.
- Arize for traces, evaluations, and audit visibility.
- Source documents and configuration rules as the approved response boundary.

## Project Notes

- [Arize integration](docs/arize-integration.md)
- [Evaluator configuration](config/evaluators.json)
- [Response scope configuration](config/response-scope.json)
