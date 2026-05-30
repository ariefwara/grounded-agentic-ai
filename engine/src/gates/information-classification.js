import { createAuditEvent } from "../audit/audit-event.js";

export async function gateInformationClassification(state) {
  const classId = state.matchedQuestion.informationClassId;
  const informationClass = state.policies.informationClasses.find((item) => item.id === classId);

  if (!informationClass) {
    return createAuditEvent({
      gate: "information_classification",
      status: "blocked",
      reasonCode: "unknown_information_class",
      details: { classId },
    });
  }

  state.informationClass = informationClass;
  return createAuditEvent({
    gate: "information_classification",
    status: "passed",
    details: { classId },
  });
}
