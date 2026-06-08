import { InMemorySessionService, Runner, isFinalResponse } from "@google/adk";
import { randomUUID } from "node:crypto";
import { createCustomerServiceAgent } from "./customer-service-agent.js";
import {
  executeConfiguredAction,
  formatActionCustomerMessage,
  isExplicitConfirmation,
} from "./business-tools.js";

const APP_NAME = "ai_customer_service_engine";

export function createAdkRuntime({
  profile,
  db,
  api,
  internalTools,
  arize,
  policies,
  env = process.env,
  runnerFactory = null,
}) {
  configureGoogleGenAiEnvironment(env);
  const sessionService = new InMemorySessionService();
  const agent = createCustomerServiceAgent({ profile, db, api, internalTools, arize, policies, env });
  const runner =
    runnerFactory?.({ agent, appName: APP_NAME, sessionService }) ||
    new Runner({
      appName: APP_NAME,
      agent,
      sessionService,
    });

  return {
    agent,

    async chat({ requestId = randomUUID(), sessionId, user, message }) {
      const effectiveSessionId = sessionId || user?.sessionId || "web-chat-default";
      const userId = user?.id || effectiveSessionId;
      await sessionService.getOrCreateSession({
        appName: APP_NAME,
        userId,
        sessionId: effectiveSessionId,
        state: {
          profileId: profile.id,
          customerIdentified: false,
          customerVerified: false,
        },
      });

      let answer = "";
      let lastText = "";
      let sawToolEvent = false;
      for await (const event of runner.runAsync({
        userId,
        sessionId: effectiveSessionId,
        newMessage: {
          role: "user",
          parts: [{ text: String(message || "") }],
        },
        customMetadata: { requestId },
      })) {
        const text = extractEventText(event);
        if (text) lastText = text;
        if (isFinalResponse(event) && text) answer = text;
        if (hasToolEvent(event)) sawToolEvent = true;
      }

      const finalAnswer = await maybeExecuteConfirmedAction({
        answer: answer || lastText,
        api,
        db,
        effectiveSessionId,
        internalTools,
        message,
        profile,
        sawToolEvent,
        sessionService,
        userId,
      });

      return {
        requestId,
        sessionId: effectiveSessionId,
        answer: finalAnswer || "I could not produce a response.",
      };
    },
  };
}

async function maybeExecuteConfirmedAction({
  answer,
  api,
  db,
  effectiveSessionId,
  internalTools,
  message,
  profile,
  sawToolEvent,
  sessionService,
  userId,
}) {
  if (!profile.action || !isExplicitConfirmation(message)) return answer;
  if (sawToolEvent && /reference number is\b/i.test(answer)) return answer;
  if (!looksLikeMissedAction(answer)) return answer;

  const session = await sessionService.getSession({
    appName: APP_NAME,
    userId,
    sessionId: effectiveSessionId,
  });
  const state = session?.state;
  if (!hasActionAccess({ profile, state })) return answer;

  const result = await executeConfiguredAction({
    profile,
    db,
    api,
    internalTools,
    actionName: profile.action.name,
  });
  return formatActionCustomerMessage(result);
}

function looksLikeMissedAction(answer) {
  return /\b(confirm|confirmation|is that correct|provide your full name|provide your .*email|verify your identity|please provide|identify you|name and email)\b/i.test(String(answer || ""));
}

function hasActionAccess({ profile, state }) {
  const identificationRequired = profile.identification?.requiredBeforeData || profile.verification?.required;
  if (identificationRequired && profile.identification?.fields?.length && !readState(state, "customerIdentified", false)) {
    return false;
  }
  if (profile.verification?.required && !readState(state, "customerVerified", false)) return false;
  return true;
}

function readState(state, key, fallback) {
  if (!state) return fallback;
  if (typeof state.get === "function") return state.get(key, fallback);
  return Object.prototype.hasOwnProperty.call(state, key) ? state[key] : fallback;
}

function hasToolEvent(event) {
  const parts = event.content?.parts || [];
  return parts.some((part) => part.functionCall || part.functionResponse);
}

function configureGoogleGenAiEnvironment(env) {
  if (env.LLM_PROVIDER === "vertex" || env.GOOGLE_GENAI_USE_VERTEXAI === "TRUE") {
    process.env.GOOGLE_GENAI_USE_VERTEXAI = "TRUE";
    process.env.GOOGLE_CLOUD_PROJECT =
      env.GOOGLE_CLOUD_PROJECT || env.GCP_PROJECT || env.VERTEX_PROJECT || "ariefwrz";
    process.env.GOOGLE_CLOUD_LOCATION = env.GOOGLE_CLOUD_LOCATION || env.VERTEX_LOCATION || "global";
  } else {
    process.env.GOOGLE_GENAI_USE_VERTEXAI = "FALSE";
    process.env.GOOGLE_GENAI_API_KEY =
      env.GOOGLE_GENAI_API_KEY || env.GEMINI_API_KEY || env.LLM_API_KEY || "";
  }
}

function extractEventText(event) {
  return (event.content?.parts || [])
    .map((part) => part.text || "")
    .filter(Boolean)
    .join("")
    .trim();
}
