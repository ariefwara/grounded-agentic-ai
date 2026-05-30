import { createAuditTrail } from "../audit/audit-writer.js";
import { runPipeline } from "./pipeline.js";

export function createDecisionEngine({ policies, auditWriter = createAuditTrail() }) {
  return {
    async evaluate(input) {
      const state = {
        input,
        policies,
        audit: auditWriter,
        decisions: [],
      };

      const result = await runPipeline(state);
      return {
        requestId: input.requestId,
        finalDecision: result.finalDecision,
        answer: result.answer,
        matchedQuestionId: result.matchedQuestion?.id ?? null,
        gates: result.decisions,
        auditTrail: auditWriter.entries(),
      };
    },
  };
}
