import { createAuditEvent } from "../audit/audit-event.js";
import { isGateEnabled } from "../gates/gate-config.js";
import { gateSemanticQuestionMatch } from "../gates/semantic-question-match.js";
import { gateInformationClassification } from "../gates/information-classification.js";
import { gateInformationEligibility } from "../gates/information-eligibility.js";
import { gateActionEligibility } from "../gates/action-eligibility.js";
import { gateAnswerBoundary } from "../gates/answer-boundary.js";
import { gateLlmResponse } from "../gates/llm-response.js";
import { gateResponseEvaluation } from "../gates/response-evaluation.js";
import { selectStandardResponse } from "../gates/standard-response.js";

const GATES = [
  { name: "semantic_question_match", run: gateSemanticQuestionMatch },
  { name: "information_classification", run: gateInformationClassification },
  { name: "information_eligibility", run: gateInformationEligibility },
  { name: "action_eligibility", run: gateActionEligibility },
  { name: "answer_boundary", run: gateAnswerBoundary },
  { name: "llm_response", run: gateLlmResponse },
  { name: "response_evaluation", run: gateResponseEvaluation },
];

export async function runPipeline(state) {
  for (const gate of GATES) {
    const result = isGateEnabled(gate.name, state.env)
      ? await gate.run(state)
      : createAuditEvent({
          gate: gate.name,
          status: "skipped",
          details: {
            configured: "off",
          },
        });

    state.decisions.push(result);
    state.audit.record(result);

    if (result.status === "blocked") {
      const standardResponse = selectStandardResponse(state, result.reasonCode);
      state.audit.record(standardResponse);
      return {
        ...state,
        finalDecision: standardResponse.finalDecision,
        answer: standardResponse.answer,
      };
    }
  }

  return {
    ...state,
    finalDecision: "sent",
    answer: state.answer,
  };
}
