import express from "express";
import { createDecisionEngine } from "../core/decision-engine.js";
import { loadPolicyBundle } from "../core/policy-loader.js";
import { createLlmClient } from "../llm/llm-client.js";

export async function createHttpApp({
  policyDir = "policies/examples",
  startedAt = new Date(),
} = {}) {
  const policies = await loadPolicyBundle(policyDir);
  const decisionEngine = createDecisionEngine({ policies, llmClient: createLlmClient() });
  const app = express();

  app.use((_request, response, next) => {
    response.setHeader("access-control-allow-origin", "*");
    response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
    response.setHeader("access-control-allow-headers", "content-type");
    next();
  });

  app.options(/.*/, (_request, response) => {
    response.sendStatus(204);
  });

  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "engine",
      uptimeSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
    });
  });

  app.post("/decisions", async (request, response, next) => {
    try {
      const result = await decisionEngine.evaluate({
        requestId: request.body.requestId ?? crypto.randomUUID(),
        channel: request.body.channel ?? "web-chat",
        user: request.body.user ?? { identityConfidence: "anonymous" },
        message: request.body.message ?? "",
        subject: request.body.subject ?? {},
      });

      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post("/chat", async (request, response, next) => {
    try {
      const result = await decisionEngine.evaluate({
        requestId: request.body.requestId ?? crypto.randomUUID(),
        channel: request.body.channel ?? "web-chat",
        user: request.body.user ?? { identityConfidence: "anonymous" },
        message: request.body.message ?? "",
        subject: request.body.subject ?? {},
      });

      response.json({
        requestId: result.requestId,
        answer: result.answer,
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _request, response, _next) => {
    response.status(500).json({
      error: "internal_error",
      message: error instanceof Error ? error.message : "Unexpected error",
    });
  });

  return app;
}
