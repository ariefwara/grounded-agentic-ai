import { gateSemanticQuestionMatch } from "../gates/semantic-question-match.js";
import { gateInformationClassification } from "../gates/information-classification.js";
import { gateInformationEligibility } from "../gates/information-eligibility.js";
import { gateActionEligibility } from "../gates/action-eligibility.js";
import { gateAnswerBoundary } from "../gates/answer-boundary.js";
import { gateResponseEvaluation } from "../gates/response-evaluation.js";
import { selectStandardResponse } from "../gates/standard-response.js";

const GATES = [
  gateSemanticQuestionMatch,
  gateInformationClassification,
  gateInformationEligibility,
  gateActionEligibility,
  gateAnswerBoundary,
  gateResponseEvaluation,
];

export async function runPipeline(state) {
  for (const gate of GATES) {
    const result = await gate(state);
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
