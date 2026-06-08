import assert from "node:assert/strict";
import test from "node:test";
import { createAdkGuardrails, evaluateCustomerResponse } from "../src/adk/adk-guardrails.js";

test("ADK instruction is rendered from the external prompt template", () => {
  const guardrails = createAdkGuardrails({
    profile: createProfile(),
    policies: createPolicies(),
    arize: createArize(),
  });

  const instruction = guardrails.buildInstruction();

  assert.match(instruction, /Role:/);
  assert.match(instruction, /Test Business/);
  assert.match(instruction, /Action 'book appointment' requires explicit customer confirmation/);
});

test("ADK guardrail replaces implementation-detail leakage", () => {
  const result = evaluateCustomerResponse({
    candidate: "I checked the Firestore database and API for that record.",
    profile: createProfile(),
    policies: createPolicies(),
  });

  assert.equal(result.decision, "blocked");
  assert.match(result.replacement, /I can help with/);
  assert.doesNotMatch(result.replacement, /Firestore|database|API/i);
});

test("ADK guardrail allows product model wording", () => {
  const result = evaluateCustomerResponse({
    candidate: "The 6-quart model is a better fit because it is easier to clean.",
    profile: createProfile(),
    policies: createPolicies(),
  });

  assert.equal(result.decision, "pass");
  assert.equal(result.replacement, null);
});

test("ADK guardrail ignores empty intermediate model events", () => {
  const result = evaluateCustomerResponse({
    candidate: "",
    profile: createProfile(),
    policies: createPolicies(),
  });

  assert.equal(result.decision, "pending");
  assert.equal(result.replacement, null);
});

function createProfile() {
  return {
    id: "test",
    brand: "Test Business",
    domain: "appointment service",
    useCase: "appointment booking",
    offers: ["compare openings", "book appointments"],
    decisionGuidance: "Help customers choose a suitable appointment.",
    identification: { mode: "none", fields: [] },
    verification: { required: false, fields: [], minimumMatches: 0 },
    action: { name: "book appointment", path: "internal_data" },
  };
}

function createPolicies() {
  return {
    standardResponses: [
      {
        id: "unsupported",
        message: "I cannot answer that request from the approved information available.",
      },
    ],
  };
}

function createArize() {
  return {
    async evaluate() {
      return { decision: "pass" };
    },
  };
}
