import { loadPolicyBundle } from "./core/policy-loader.js";
import { loadEnvFiles } from "./config/env-loader.js";

export { loadPolicyBundle } from "./core/policy-loader.js";
export { createAdkRuntime } from "./adk/adk-runtime.js";
export { createBusinessTools } from "./adk/business-tools.js";
export { createCustomerServiceAgent } from "./adk/customer-service-agent.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  await loadEnvFiles();
  const policies = await loadPolicyBundle("policies/examples");
  console.log(JSON.stringify({ runtime: "google-adk", loadedPolicySections: Object.keys(policies) }, null, 2));
}
