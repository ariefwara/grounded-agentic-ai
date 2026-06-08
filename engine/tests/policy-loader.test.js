import assert from "node:assert/strict";
import test from "node:test";
import { loadPolicyBundle } from "../src/core/policy-loader.js";

test("loads the ADK guardrail policy bundle", async () => {
  const policies = await loadPolicyBundle("policies/examples");

  assert.ok(Array.isArray(policies.standardResponses));
  assert.ok(policies.standardResponses.length > 0);
  assert.equal("canonicalQuestions" in policies, false);
  assert.equal("answerBoundaries" in policies, false);
});
