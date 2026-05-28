# Arize Integration

Grounded Agentic AI uses Arize as the evaluation and audit layer for AI-generated business responses. The product does not treat generated text as final output; every answer is traced, evaluated, and either approved or dropped before delivery.

## Required Arize Resources

- **Project**: groups traces and evaluations for this application.
- **Traces**: capture each end-to-end response attempt.
- **Spans**: capture retrieval, generation, evaluation, retry, and final delivery steps.
- **Evaluators**: score whether an answer is grounded, compliant, and written in the approved style.
- **Datasets**: hold regression cases for sensitive support, policy, incident, sales, and public communication examples.
- **Experiments**: compare prompt, policy, evaluator, and model changes before rollout.

## Trace Shape

Each request should produce one trace with these spans:

1. `request.received`
2. `source.retrieve`
3. `response.generate`
4. `response.evaluate.groundedness`
5. `response.evaluate.policy`
6. `response.evaluate.style`
7. `response.gate`
8. `response.retry` when needed
9. `response.approved` when the answer passes

## Gate Decision

The delivery gate should only allow a response when all required evaluators pass. If one evaluator fails, the response is dropped and regenerated with failure feedback.

Recommended gate output:

```json
{
  "allowed": true,
  "decision": "approved",
  "failed_checks": [],
  "retry_count": 0
}
```

Failed example:

```json
{
  "allowed": false,
  "decision": "retry",
  "failed_checks": ["unsupported_claim", "style_mismatch"],
  "retry_count": 1
}
```

## Minimal API Surface

Only these Arize capabilities are required for the first version:

- Create or reuse one project.
- Send traces and spans for every response attempt.
- Run groundedness, policy, and style evaluators.
- Store pass/fail evaluator results on the trace.
- Build datasets from failed and approved examples.
- Run experiments before changing prompts or evaluator rules.
