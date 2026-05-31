import { loadEnvFiles } from "./config/env-loader.js";
import { createHttpApp } from "./http/app.js";

await loadEnvFiles();

const port = Number(process.env.PORT || 3000);
const app = await createHttpApp({
  policyDir: process.env.POLICY_DIR || "policies/examples",
});

app.listen(port, "0.0.0.0", () => {
  console.log(`engine listening on ${port}`);
});
