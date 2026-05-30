import { createAuditEvent } from "../audit/audit-event.js";

export async function gateAnswerBoundary(state) {
  const boundary = state.policies.answerBoundaries.find(
    (item) => item.id === state.matchedQuestion.answerBoundaryId,
  );

  if (!boundary) {
    return createAuditEvent({
      gate: "answer_boundary",
      status: "blocked",
      reasonCode: "missing_answer_boundary",
      details: { answerBoundaryId: state.matchedQuestion.answerBoundaryId },
    });
  }

  state.answerBoundary = boundary;
  state.answer = renderTemplate(boundary.template, {
    channel: state.input.channel,
  });

  return createAuditEvent({
    gate: "answer_boundary",
    status: "passed",
    details: { answerBoundaryId: boundary.id },
  });
}

function renderTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "");
}
