import { LlmAgent } from "@google/adk";
import { createBusinessTools } from "./business-tools.js";
import { createAdkGuardrails } from "./adk-guardrails.js";

export function createCustomerServiceAgent({ profile, db, api, internalTools, arize, policies, env = process.env }) {
  const tools = createBusinessTools({ profile, db, api, internalTools, arize });
  const guardrails = createAdkGuardrails({ profile, arize, policies });

  return new LlmAgent({
    name: `customer_service_${profile.id}`,
    model: env.ADK_MODEL || env.VERTEX_TEXT_MODEL || env.GEMINI_MODEL || "gemini-2.5-flash",
    description: `AI customer-service agent for ${profile.domain}.`,
    includeContents: "default",
    generateContentConfig: {
      temperature: Number(env.LLM_TEMPERATURE ?? 0.2),
    },
    instruction: guardrails.buildInstruction(),
    tools,
    afterModelCallback: guardrails.afterModelCallback,
  });
}
