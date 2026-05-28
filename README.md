# Grounded Agentic AI

## Competition

Google Cloud Rapid Agent Hackathon - Arize track.

## Initial Idea

Grounded Agentic AI is an AI review agent for sensitive business information that can only answer using approved content and response styles defined in configuration and source documents. The agent uses Gemini, Google Cloud, and Arize to trace outputs, evaluate every response against approved sources, drop non-compliant answers, and retry until it produces an audit-ready response for customers or employees.

## Core Problem

Companies often need to distribute sensitive information to customers or employees, but ordinary AI assistants can phrase things incorrectly, overstate claims, hallucinate unsupported facts, or answer outside approved policy. For sensitive communication, the problem is not just whether the answer sounds good, but whether it is allowed, grounded, and written in the approved way.

## Example Use Case: Verified Support

One primary use case is Verified Support: customer support responses that must be checked against approved support policies, product documentation, refund rules, incident notes, and response style guidelines before they are sent.

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

## Draft Form Answer

I plan to build Grounded Agentic AI, an AI review agent for sensitive business information that can only answer using approved content and response styles defined in configuration and source documents. The agent will use Gemini, Google Cloud, and Arize to trace outputs, evaluate every response against those approved sources, drop non-compliant answers, and retry until it produces an audit-ready response for customers or employees.

## Additional Support Needed

Access to Google Cloud credits, clear Arize setup guidance, and example evaluation templates for groundedness, hallucination detection, and policy/style compliance would help complete the submission more effectively. Sample traces or reference architectures for production AI agents would also be useful for building a credible demo and audit workflow.

## Secret Handling

Real credentials must stay outside the repository. Local development should use a private `.env` file copied from `.env.example`, while production should use Google Cloud Secret Manager or Cloud Run environment secrets.

Required local variables:

- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GEMINI_API_KEY`
- `ARIZE_API_KEY`
- `ARIZE_SPACE_ID`
- `GITHUB_TOKEN`
