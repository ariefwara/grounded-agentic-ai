import { createDecisionEngine } from "./core/decision-engine.js";
import { loadPolicyBundle } from "./core/policy-loader.js";

export { createDecisionEngine } from "./core/decision-engine.js";
export { loadPolicyBundle } from "./core/policy-loader.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  const policies = await loadPolicyBundle("policies/examples");
  const engine = createDecisionEngine({ policies });

  const result = await engine.evaluate({
    requestId: "demo-001",
    channel: "web-chat",
    user: {
      identityConfidence: "verified_customer",
      roles: ["customer"],
      accountIds: ["acct_123"],
    },
    message: "Can I get a refund?",
    subject: {
      accountId: "acct_123",
    },
  });

  console.log(JSON.stringify(result, null, 2));
}
