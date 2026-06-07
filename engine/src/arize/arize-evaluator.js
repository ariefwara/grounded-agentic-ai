import {
  OpenInferenceSpanKind,
  SemanticConventions,
  SpanStatusCode,
  register,
  trace,
} from "@arizeai/phoenix-otel";

const MAX_ATTRIBUTE_LENGTH = 16_000;

export function createArizeEvaluator(env = process.env) {
  const provider = createPhoenixProvider(env);
  const tracer = trace.getTracer("engine-arize-evaluator");
  const enabled = Boolean(provider);

  return {
    enabled,

    async evaluate(input) {
      const result = evaluateLocally(input);

      if (!enabled) return result;

      return await tracer.startActiveSpan(`arize.evaluate.${input.type || "unknown"}`, async (span) => {
        try {
          span.setAttribute(SemanticConventions.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKind.EVALUATOR);
          span.setAttribute("arize.evaluation.type", String(input.type || "unknown"));
          span.setAttribute("arize.evaluation.runtime_mode", "phoenix_trace_with_local_decision");
          span.setAttribute("arize.evaluation.decision", result.decision);
          span.setAttribute("arize.evaluation.fallback_decision", input.decision ?? "");
          span.setAttribute("input.value", serializeAttribute({
            type: input.type,
            candidate: input.candidate,
            evidence: input.evidence || [],
            requestedDecision: input.decision ?? null,
          }));
          span.setAttribute("output.value", serializeAttribute(result));
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : "Arize evaluation trace failed" });
          return result;
        } finally {
          span.end();
        }
      });
    },

    async shutdown() {
      await provider?.shutdown();
    },
  };
}

function createPhoenixProvider(env) {
  if (env.ARIZE_ENABLED === "off" || env.PHOENIX_ENABLED === "off") return null;

  const url = env.PHOENIX_COLLECTOR_ENDPOINT || env.PHOENIX_URL || env.ARIZE_COLLECTOR_ENDPOINT || env.ARIZE_ENDPOINT;
  const apiKey = env.PHOENIX_API_KEY || env.ARIZE_API_KEY;
  const shouldEnable = env.ARIZE_ENABLED === "on" || env.PHOENIX_ENABLED === "on" || Boolean(url || apiKey);

  if (!shouldEnable) return null;

  return register({
    projectName: env.PHOENIX_PROJECT_NAME || env.ARIZE_PROJECT_NAME || "ai-assistant-engine",
    url,
    apiKey,
    batch: env.PHOENIX_BATCH !== "false",
  });
}

function evaluateLocally({ type, candidate, evidence = [], decision = null }) {
  if (type === "groundedness") {
    return { decision: evidence.length > 0 ? "pass" : "retry" };
  }

  if (type === "intent") {
    return { decision: decision || "clear" };
  }

  if (type === "classification") {
    return { decision: decision || "usable" };
  }

  if (type === "verification") {
    return { decision: decision || "fail" };
  }

  if (typeof candidate === "string" && candidate.trim().length === 0) {
    return { decision: "retry" };
  }

  return { decision: decision || "pass" };
}

function serializeAttribute(value) {
  const serialized = JSON.stringify(value);
  if (serialized.length <= MAX_ATTRIBUTE_LENGTH) return serialized;
  return `${serialized.slice(0, MAX_ATTRIBUTE_LENGTH)}...`;
}
