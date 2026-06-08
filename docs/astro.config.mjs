import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://agentic-ai-e6e15.web.app",
  base: process.env.DOCS_BASE_PATH || "/ai-customer-service-engine/",
  output: "static",
  server: {
    host: true,
    port: 4321,
  },
});
