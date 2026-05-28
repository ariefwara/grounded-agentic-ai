# Grounded Agentic AI

## Competition

Google Cloud Rapid Agent Hackathon - Arize track.

## Overview

Grounded Agentic AI is an AI review agent for sensitive business information that can only answer using approved content and response styles defined in configuration and source documents. The agent uses Gemini, Google Cloud, and Arize to trace outputs, evaluate every response against approved sources, drop non-compliant answers, and retry until it produces an audit-ready response for customers or employees.

## Core Problem

Companies often need to distribute sensitive information to customers or employees, but ordinary AI assistants can phrase things incorrectly, overstate claims, hallucinate unsupported facts, or answer outside approved policy. For sensitive communication, the problem is not just whether the answer sounds good, but whether it is allowed, grounded, and written in the approved way.

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

- Claims explicitly supported by approved documents.
- Response styles explicitly allowed by configuration.
- Wording patterns that match the intended audience and channel.
- Outputs that pass automated review before delivery.

If the generated response does not comply, the system must drop it and retry. Supervision happens through audit logs and evaluation traces, not constant manual human review.

## How It Works

1. A user requests a customer-facing or employee-facing answer.
2. The agent retrieves approved source documents and configuration rules.
3. Gemini drafts a response using only the allowed content and style.
4. Arize traces the request, source context, generated answer, and evaluation result.
5. Evaluators check whether the answer is grounded, compliant, and written in the approved style.
6. If the answer fails, it is dropped and regenerated.
7. If the answer passes, the system returns an audit-ready response.

## Technology

- Gemini for answer generation and review loops.
- Google Cloud for deployment and runtime services.
- Arize for traces, evaluations, and audit visibility.
- Source documents and configuration rules as the approved response boundary.

## Secret Handling

Real credentials must stay outside the repository. Local development should use a private `.env` file copied from `.env.example`, while production should use Google Cloud Secret Manager or Cloud Run environment secrets.

Required local variables:

- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GEMINI_API_KEY`
- `ARIZE_API_KEY`
- `ARIZE_SPACE_ID`
- `GITHUB_TOKEN`
