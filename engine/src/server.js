import { loadEnvFiles } from "./config/env-loader.js";
import { createHttpApp } from "./http/app.js";

await loadEnvFiles();

const port = Number(process.env.PORT || 3000);
const app = await createHttpApp({
  policyDir: process.env.POLICY_DIR || "policies/examples",
  profileId: process.env.ENGINE_PROFILE_ID || "generic",
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`engine listening on ${port} with profile ${process.env.ENGINE_PROFILE_ID || "generic"}`);
});

async function shutdown() {
  server.close(async () => {
    await app.locals.arize?.shutdown?.();
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
