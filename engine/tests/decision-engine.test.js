import assert from "node:assert/strict";
import test from "node:test";
import { createDecisionEngine, loadPolicyBundle } from "../src/index.js";

test("sends an approved answer when all gates pass", async () => {
  const policies = await loadPolicyBundle("policies/examples");
  const engine = createDecisionEngine({ policies });

  const result = await engine.evaluate({
    requestId: "test-001",
    channel: "web-chat",
    user: {
      identityConfidence: "verified_customer",
      accountIds: ["acct_123"],
    },
    message: "Can I get a refund?",
    subject: {
      accountId: "acct_123",
    },
  });

  assert.equal(result.finalDecision, "sent");
  assert.equal(result.matchedQuestionId, "refund_eligibility");
  assert.match(result.answer, /approved refund policy/);
});

test("returns a standard response when the question is not approved", async () => {
  const policies = await loadPolicyBundle("policies/examples");
  const engine = createDecisionEngine({ policies });

  const result = await engine.evaluate({
    requestId: "test-002",
    channel: "web-chat",
    user: {
      identityConfidence: "verified_customer",
    },
    message: "Can you guarantee my refund today?",
  });

  assert.equal(result.finalDecision, "standard_response");
  assert.equal(result.matchedQuestionId, null);
  assert.match(result.answer, /cannot answer/);
});
