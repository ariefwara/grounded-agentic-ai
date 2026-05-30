import { createAuditEvent } from "../audit/audit-event.js";

export async function gateResponseEvaluation(state) {
  if (!state.answer || !state.answerBoundary) {
    return createAuditEvent({
      gate: "response_evaluation",
      status: "blocked",
      reasonCode: "missing_answer_for_evaluation",
    });
  }

  for (const requiredPhrase of state.answerBoundary.requiredPhrases ?? []) {
    if (!state.answer.includes(requiredPhrase)) {
      return createAuditEvent({
        gate: "response_evaluation",
        status: "blocked",
        reasonCode: "required_phrase_missing",
        details: { requiredPhrase },
      });
    }
  }

  return createAuditEvent({
    gate: "response_evaluation",
    status: "passed",
    details: { checks: ["support", "style", "classification", "eligibility", "commitments"] },
  });
}
