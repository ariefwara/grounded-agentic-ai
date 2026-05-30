import { createAuditEvent } from "../audit/audit-event.js";

export async function gateActionEligibility(state) {
  const actionId = state.matchedQuestion.actionId;
  if (!actionId) {
    return createAuditEvent({
      gate: "action_eligibility",
      status: "passed",
      details: { actionRequired: false },
    });
  }

  const action = state.policies.actionRegistry.find((item) => item.id === actionId);
  if (!action || action.status !== "enabled") {
    return createAuditEvent({
      gate: "action_eligibility",
      status: "blocked",
      reasonCode: "action_not_available",
      details: { actionId },
    });
  }

  if (action.allowedChannels?.length && !action.allowedChannels.includes(state.input.channel)) {
    return createAuditEvent({
      gate: "action_eligibility",
      status: "blocked",
      reasonCode: "action_channel_not_allowed",
      details: { actionId, channel: state.input.channel },
    });
  }

  state.action = action;
  return createAuditEvent({
    gate: "action_eligibility",
    status: "passed",
    details: { actionId },
  });
}
