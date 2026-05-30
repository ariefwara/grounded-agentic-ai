import { createAuditEvent } from "../audit/audit-event.js";

export async function gateSemanticQuestionMatch(state) {
  const message = normalize(state.input.message);
  const match = state.policies.canonicalQuestions.find((question) =>
    question.utterances.some((utterance) => message.includes(normalize(utterance))),
  );

  if (!match) {
    return createAuditEvent({
      gate: "semantic_question_match",
      status: "blocked",
      reasonCode: "no_approved_question_match",
      details: { message: state.input.message },
    });
  }

  state.matchedQuestion = match;
  return createAuditEvent({
    gate: "semantic_question_match",
    status: "passed",
    details: { questionId: match.id },
  });
}

function normalize(value) {
  return String(value).toLowerCase().replace(/[^\w\s]/g, "").trim();
}
