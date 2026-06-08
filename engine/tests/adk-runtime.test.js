import assert from "node:assert/strict";
import test from "node:test";
import { createAdkRuntime } from "../src/adk/adk-runtime.js";

test("ADK runtime fallback executes confirmed action when Gemini asks for confirmation again", async () => {
  const runtime = createAdkRuntime({
    profile: {
      id: "test",
      brand: "Test",
      domain: "test",
      offers: [],
      action: { name: "open card dispute", path: "internal_data" },
      identification: { fields: [] },
      verification: { required: false },
      externalIntegrations: {},
    },
    db: {
      async executeDataChange() {
        return { status: "completed", ticketId: "DSP-1" };
      },
    },
    api: {},
    internalTools: {},
    policies: { standardResponses: [] },
    arize: { async evaluate() {} },
    env: { LLM_PROVIDER: "vertex", GOOGLE_GENAI_USE_VERTEXAI: "TRUE" },
    runnerFactory: ({ sessionService }) => ({
      async *runAsync({ userId, sessionId }) {
        await sessionService.getOrCreateSession({
          appName: "ai_customer_service_engine",
          userId,
          sessionId,
          state: { customerIdentified: true, customerVerified: true },
        });
        yield {
          actions: {},
          content: {
            role: "model",
            parts: [{ text: "Just to be clear, you want to open a dispute. Is that correct?" }],
          },
        };
      },
    }),
  });

  const result = await runtime.chat({
    sessionId: "session-1",
    message: "Yes, dispute it.",
  });

  assert.equal(result.answer, "The action was completed successfully. Your reference number is DSP-1.");
});
