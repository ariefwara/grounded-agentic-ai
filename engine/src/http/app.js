import express from "express";
import { randomUUID } from "node:crypto";
import { loadPolicyBundle } from "../core/policy-loader.js";
import { createInternalDb } from "../db/internal-db.js";
import { createExternalApi } from "../api/external-api.js";
import { createInternalTools } from "../tools/internal-tools.js";
import { createArizeEvaluator } from "../arize/arize-evaluator.js";
import { loadEngineProfile } from "../config/engine-profiles.js";
import { createAdkRuntime } from "../adk/adk-runtime.js";

export async function createHttpApp({
  policyDir = "policies/examples",
  profileId = "generic",
  startedAt = new Date(),
} = {}) {
  const profile = loadEngineProfile(profileId);
  const policies = await loadPolicyBundle(policyDir);
  const arize = createArizeEvaluator();
  const adkRuntime = createAdkRuntime({
    db: createInternalDb({ config: profile.data }),
    api: createExternalApi({ integrations: profile.externalIntegrations }),
    internalTools: createInternalTools(),
    arize,
    profile,
    policies,
  });
  const app = express();
  app.locals.arize = arize;

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
      runtime: "google-adk",
      profileId: profile.id,
      uptimeSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
    });
  });

  app.post("/chat", async (request, response, next) => {
    try {
      const result = await adkRuntime.chat({
        requestId: request.body.requestId ?? randomUUID(),
        sessionId: request.body.sessionId,
        user: request.body.user ?? { identityConfidence: "anonymous" },
        message: request.body.message ?? "",
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
