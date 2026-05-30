import { createAuditEvent } from "../audit/audit-event.js";

export async function gateInformationEligibility(state) {
  const rule = state.policies.eligibilityRules.find(
    (item) => item.id === state.informationClass.eligibilityRuleId,
  );

  if (!rule) {
    return createAuditEvent({
      gate: "information_eligibility",
      status: "blocked",
      reasonCode: "missing_eligibility_rule",
      details: { ruleId: state.informationClass.eligibilityRuleId },
    });
  }

  const allowed = evaluateRule(rule, state.input);
  if (!allowed) {
    return createAuditEvent({
      gate: "information_eligibility",
      status: "blocked",
      reasonCode: "user_not_eligible",
      details: { ruleId: rule.id },
    });
  }

  return createAuditEvent({
    gate: "information_eligibility",
    status: "passed",
    details: { ruleId: rule.id },
  });
}

function evaluateRule(rule, input) {
  if (rule.requiredIdentityConfidence?.length) {
    if (!rule.requiredIdentityConfidence.includes(input.user?.identityConfidence)) return false;
  }

  if (rule.requireAccountOwnership) {
    const subjectAccount = input.subject?.accountId;
    if (!subjectAccount || !input.user?.accountIds?.includes(subjectAccount)) return false;
  }

  if (rule.allowedChannels?.length && !rule.allowedChannels.includes(input.channel)) return false;
  return true;
}
