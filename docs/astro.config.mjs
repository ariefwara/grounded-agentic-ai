import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://ariefwara.github.io",
  base: process.env.DOCS_BASE_PATH || "/grounded-agentic-ai/",
  output: "static",
  server: {
    host: true,
    port: 4321,
  },
});
