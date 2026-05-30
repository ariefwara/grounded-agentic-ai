import { createAuditEvent } from "../audit/audit-event.js";

export function selectStandardResponse(state, reasonCode) {
  const response =
    state.policies.standardResponses.find((item) => item.reasonCodes.includes(reasonCode)) ??
    state.policies.standardResponses.find((item) => item.id === "generic_unavailable");

  return createAuditEvent({
    gate: "standard_response",
    status: "selected",
    reasonCode,
    details: { standardResponseId: response?.id ?? null },
    finalDecision: "standard_response",
    answer: response?.message ?? "I cannot answer that request from the approved information available.",
  });
}
