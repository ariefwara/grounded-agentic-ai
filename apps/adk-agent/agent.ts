import { FunctionTool, LlmAgent } from '@google/adk';
import { z } from 'zod';
import { callBusinessEngine } from './src/engine-client.mjs';

const chatWithBusinessEngine = new FunctionTool({
  name: 'chat_with_business_engine',
  description:
    'Routes a customer-service message to the policy-first business engine and returns the customer-facing answer.',
  parameters: z.object({
    message: z.string().describe('The latest customer message.'),
    sessionId: z
      .string()
      .optional()
      .describe('Stable conversation session ID. Use the same value for follow-up turns.'),
  }),
  execute: async ({ message, sessionId }) => {
    return await callBusinessEngine({
      message,
      sessionId: sessionId || 'adk-agent-default-session',
      channel: 'adk-agent',
    });
  },
});

export const rootAgent = new LlmAgent({
  name: 'ai_customer_service_engine_adk_agent',
  model: process.env.ADK_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  description:
    'ADK wrapper for a configurable AI customer-service engine that guides business conversations and completes supported actions.',
  instruction: `
You are the ADK entrypoint for AI Customer Service Engine.

Use the chat_with_business_engine tool for every customer-service message.
The business engine owns profile configuration, policy checks, retrieval, verification, action execution, and response evaluation.
Return the answer from the tool directly. Do not add unsupported claims, extra policy, or invented business details.
If the tool returns an error, explain briefly that the business engine is unavailable.
`,
  tools: [chatWithBusinessEngine],
});
