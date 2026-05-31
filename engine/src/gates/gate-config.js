export const GATE_FLAGS = {
  semantic_question_match: "GATE_SEMANTIC_QUESTION_MATCH",
  information_classification: "GATE_INFORMATION_CLASSIFICATION",
  information_eligibility: "GATE_INFORMATION_ELIGIBILITY",
  action_eligibility: "GATE_ACTION_ELIGIBILITY",
  answer_boundary: "GATE_ANSWER_BOUNDARY",
  llm_response: "GATE_LLM_RESPONSE",
  response_evaluation: "GATE_RESPONSE_EVALUATION",
};

export function isGateEnabled(gateName, env = process.env) {
  const key = GATE_FLAGS[gateName];
  if (!key) return true;

  const value = String(env[key] ?? "on").trim().toLowerCase();
  return !["0", "false", "off", "disabled", "skip", "skipped"].includes(value);
}
