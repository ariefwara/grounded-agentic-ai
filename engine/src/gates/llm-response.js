import { createAuditEvent } from "../audit/audit-event.js";

export async function gateLlmResponse(state) {
  if (!state.llmClient?.enabled) {
    return createAuditEvent({
      gate: "llm_response",
      status: "passed",
      details: { providerEnabled: false },
    });
  }

  try {
    state.answer = await state.llmClient.generateAnswer({
      userMessage: state.input.message,
      approvedAnswer: state.answer,
      questionTitle: state.matchedQuestion?.title,
    });

    return createAuditEvent({
      gate: "llm_response",
      status: "passed",
      details: { providerEnabled: true },
    });
  } catch (error) {
    return createAuditEvent({
      gate: "llm_response",
      status: "blocked",
      reasonCode: "llm_request_failed",
      details: {
        message: error instanceof Error ? error.message : "Unknown LLM error",
      },
    });
  }
}
