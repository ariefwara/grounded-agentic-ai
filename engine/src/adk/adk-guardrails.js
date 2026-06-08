import { renderPrompt } from "../prompts/prompt-loader.js";

const IMPLEMENTATION_TERMS = /\b(database|db|api|firestore|tool|tools|prompt|gemini|llm)\b/i;

export function createAdkGuardrails({ profile, arize, policies = {} }) {
  return {
    buildInstruction() {
      return renderPrompt("adk/customer-service-agent", {
        profileBrand: profile.brand,
        profileDomain: profile.domain,
        profileUseCase: profile.useCase,
        profileOffers: formatList(profile.offers || []),
        policyControls: summarizePolicies({ profile, policies }),
        decisionGuidance: profile.decisionGuidance || "Help the customer understand options and choose a suitable next step.",
        identificationMode: profile.identification?.mode || "none",
        identificationFields: formatInlineList(profile.identification?.fields || []),
        verificationRequired: profile.verification?.required ? "yes" : "no",
        verificationFields: formatInlineList(profile.verification?.fields || []),
        minimumVerificationMatches: profile.verification?.minimumMatches || 0,
        actionName: profile.action?.name || "none",
      });
    },

    async afterModelCallback({ context, response }) {
      const actionResponse = await consumeActionResponse({ context, arize });
      if (actionResponse) return actionResponse;

      const candidate = extractText(response.content);
      if (!candidate) return undefined;

      const evaluation = evaluateCustomerResponse({ candidate, profile, policies });
      await arize.evaluate({
        type: "adk_response_guardrail",
        candidate,
        evidence: evaluation.evidence,
        decision: evaluation.decision,
      });

      if (evaluation.replacement) {
        return {
          content: {
            role: "model",
            parts: [{ text: evaluation.replacement }],
          },
        };
      }

      return undefined;
    },
  };
}

export function evaluateCustomerResponse({ candidate, profile, policies = {} }) {
  const answer = String(candidate || "").trim();
  if (!answer) {
    return {
      decision: "pending",
      replacement: null,
      evidence: ["empty response"],
    };
  }

  if (IMPLEMENTATION_TERMS.test(answer)) {
    return {
      decision: "blocked",
      replacement: buildImplementationSafeResponse(profile),
      evidence: ["implementation detail leakage"],
    };
  }

  const standardResponses = policies.standardResponses || [];
  return {
    decision: "pass",
    replacement: null,
    evidence: standardResponses.map((item) => item.id).slice(0, 5),
  };
}

async function consumeActionResponse({ context, arize }) {
  if (!context.state.get("actionResponsePending", false)) return null;

  const actionCustomerMessage = context.state.get("actionCustomerMessage", "");
  context.state.set("actionResponsePending", false);
  if (!actionCustomerMessage) return null;

  await arize.evaluate({
    type: "adk_action_response",
    candidate: actionCustomerMessage,
    evidence: [context.state.get("lastAction", {})],
    decision: "pass",
  });
  return {
    content: {
      role: "model",
      parts: [{ text: actionCustomerMessage }],
    },
  };
}

function summarizePolicies({ profile, policies }) {
  const values = [
    `Answer only within ${profile.brand}'s supported business scope.`,
    "Use configured business data and policy facts before making recommendations.",
    profile.identification?.fields?.length
      ? `Customer-specific service requires identification: ${formatInlineList(profile.identification.fields)}.`
      : "Public service does not require customer identification unless the configured action requires it.",
    profile.verification?.required
      ? `Protected service requires ${profile.verification.minimumMatches || 1} matching private verification answer(s).`
      : "No private verification is required for this profile.",
    profile.action?.name
      ? `Action '${profile.action.name}' requires explicit customer confirmation.`
      : "No business action is configured.",
  ];

  for (const response of policies.standardResponses || []) {
    values.push(`Fallback policy '${response.id}': ${response.message}`);
  }

  return formatList(values);
}

function buildImplementationSafeResponse(profile) {
  return `I can help with ${formatInlineList(profile.offers || ["this service"])}. What would you like to do next?`;
}

function formatList(values) {
  if (!values.length) return "- none";
  return values.map((value) => `- ${value}`).join("\n");
}

function formatInlineList(values) {
  if (!values.length) return "none";
  return values.join(", ");
}

function extractText(content) {
  return (content?.parts || [])
    .map((part) => part.text || "")
    .filter(Boolean)
    .join("")
    .trim();
}
