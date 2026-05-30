import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_SCOPE_FILE = "docs/product-scope.md";
const DEFAULT_PHILOSOPHY_FILE = "docs/writing-philosophy.md";
const DEFAULT_OUTPUT_DIR = "docs/features";
const DEFAULT_PROMPT_DIR = "docs/prompts/features";
const DEFAULT_MODEL = "deepseek-chat";
const DEFAULT_CONCURRENCY = 6;
const DEFAULT_MAX_RETRIES = 6;

const FEATURES = [
  {
    slug: "identity-context-resolution",
    title: "Identity and Context Resolution",
    focus:
      "How the system resolves user identity and context when the user may not be logged in.",
  },
  {
    slug: "request-understanding",
    title: "Request Understanding",
    focus:
      "How the system understands whether the user is asking a question, requesting information, requesting an action, or providing an ambiguous request.",
  },
  {
    slug: "semantic-question-matching",
    title: "Semantic Question Matching",
    focus:
      "How user wording maps to predefined canonical questions or approved intents based on meaning, not exact text.",
  },
  {
    slug: "standard-response",
    title: "Standard Response",
    focus:
      "How the system responds when a request cannot be answered or processed, without improvising.",
  },
  {
    slug: "request-type-classification",
    title: "Request Type Classification",
    focus:
      "How the system determines whether a matched request is answer-only, information-bearing, action-bearing, verification-required, or not allowed.",
  },
  {
    slug: "retrieval-query-governance",
    title: "Retrieval and Query Governance",
    focus:
      "How the system retrieves relevant documents or runs relevant queries only when they are allowed for the matched request.",
  },
  {
    slug: "information-classification",
    title: "Information Classification",
    focus:
      "How information is classified before it can be used or disclosed.",
  },
  {
    slug: "information-eligibility",
    title: "Information Eligibility",
    focus:
      "How the system decides whether the current user can receive the requested or retrieved information.",
  },
  {
    slug: "action-eligibility",
    title: "Action Eligibility",
    focus:
      "How predefined actions, including API calls, are allowed or denied based on classification, eligibility, policy, channel, context, and auditability.",
  },
  {
    slug: "approved-answer-boundary",
    title: "Approved Answer Boundary",
    focus:
      "How the system selects an approved answer, answer template, answer policy, or fallback boundary before generation.",
  },
  {
    slug: "semantic-answer-equivalence",
    title: "Semantic Answer Equivalence",
    focus:
      "How final wording may differ while preserving approved meaning, required conditions, response style, and disclosure limits.",
  },
  {
    slug: "intermediate-output-gating",
    title: "Intermediate Output Gating",
    focus:
      "How governance applies to intermediate responses, retrieval decisions, query decisions, tool calls, drafts, retry outputs, and final answers.",
  },
  {
    slug: "response-evaluation",
    title: "Response Evaluation",
    focus:
      "How the system checks support, style, classification, eligibility, commitments, and disclosure safety before sending.",
  },
  {
    slug: "drop-retry-decision",
    title: "Drop, Retry, or Standard Response",
    focus:
      "How failed outputs are dropped, retried, blocked, or replaced with a standard response.",
  },
  {
    slug: "audit-trail",
    title: "Audit Trail",
    focus:
      "How the system records request, context, matching, retrieval, classification, eligibility, action, gate, retry, and final delivery decisions.",
  },
];

function parseArgs(argv) {
  const args = {
    scopeFile: DEFAULT_SCOPE_FILE,
    philosophyFile: DEFAULT_PHILOSOPHY_FILE,
    outputDir: DEFAULT_OUTPUT_DIR,
    promptDir: DEFAULT_PROMPT_DIR,
    model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
    temperature: Number(process.env.DEEPSEEK_TEMPERATURE || 0.35),
    maxTokens: Number(process.env.DEEPSEEK_MAX_TOKENS || 3000),
    concurrency: Number(process.env.DEEPSEEK_CONCURRENCY || DEFAULT_CONCURRENCY),
    maxRetries: Number(process.env.DEEPSEEK_MAX_RETRIES || DEFAULT_MAX_RETRIES),
    target: null,
    all: false,
    force: false,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--scope-file") args.scopeFile = argv[++i];
    else if (item === "--philosophy-file") args.philosophyFile = argv[++i];
    else if (item === "--output-dir") args.outputDir = argv[++i];
    else if (item === "--prompt-dir") args.promptDir = argv[++i];
    else if (item === "--model") args.model = argv[++i];
    else if (item === "--temperature") args.temperature = Number(argv[++i]);
    else if (item === "--max-tokens") args.maxTokens = Number(argv[++i]);
    else if (item === "--concurrency") args.concurrency = Number(argv[++i]);
    else if (item === "--max-retries") args.maxRetries = Number(argv[++i]);
    else if (item === "--target") args.target = argv[++i];
    else if (item === "--all") args.all = true;
    else if (item === "--force") args.force = true;
    else if (item === "--dry-run") args.dryRun = true;
    else if (item === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${item}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/generate-feature-docs-with-deepseek.mjs --all
  node scripts/generate-feature-docs-with-deepseek.mjs --target semantic-question-matching
  node scripts/generate-feature-docs-with-deepseek.mjs --all --dry-run

Options:
  --scope-file <file>       Scope source. Default: ${DEFAULT_SCOPE_FILE}
  --philosophy-file <file>  Writing philosophy. Default: ${DEFAULT_PHILOSOPHY_FILE}
  --output-dir <dir>        Feature Markdown output. Default: ${DEFAULT_OUTPUT_DIR}
  --prompt-dir <dir>        Prompt audit output. Default: ${DEFAULT_PROMPT_DIR}
  --target <slug>           Generate one feature by slug.
  --all                     Generate all features.
  --model <name>            DeepSeek model. Default: env DEEPSEEK_MODEL or ${DEFAULT_MODEL}
  --temperature <n>         Default: 0.35
  --max-tokens <n>          Default: 3000
  --concurrency <n>         Parallel calls. Default: ${DEFAULT_CONCURRENCY}
  --max-retries <n>         Retries per feature. Default: ${DEFAULT_MAX_RETRIES}
  --dry-run                 Write prompts only, without calling DeepSeek.
  --force                   Overwrite existing feature files.
`);
}

function validateArgs(args) {
  for (const key of ["temperature", "maxTokens", "concurrency", "maxRetries"]) {
    if (!Number.isFinite(args[key]) || args[key] <= 0) {
      throw new Error(`${key} must be a positive number.`);
    }
  }
  args.concurrency = Math.floor(args.concurrency);
  args.maxRetries = Math.floor(args.maxRetries);
  if (!args.all && !args.target) {
    throw new Error("No target selected. Use --all or --target <slug>.");
  }
}

async function loadEnv() {
  const env = {};
  try {
    const raw = await readFile(".env", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
      const index = line.indexOf("=");
      env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
    }
  } catch {
    // Environment can be supplied externally.
  }
  Object.assign(process.env, env);
}

async function pathExists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

function selectFeatures(args) {
  if (args.all) return FEATURES;
  const feature = FEATURES.find((item) => item.slug === args.target);
  if (!feature) {
    const slugs = FEATURES.map((item) => item.slug).join(", ");
    throw new Error(`Unknown feature slug: ${args.target}. Available: ${slugs}`);
  }
  return [feature];
}

function buildPrompt({ scope, philosophy, feature }) {
  return `
# Task
Write one Markdown document explaining one feature of Grounded Agentic AI.

# Feature
Title: ${feature.title}
Slug: ${feature.slug}
Focus: ${feature.focus}

# Product Scope Source
${scope}

# Writing Philosophy
${philosophy}

# Instructions
- Explain only this feature.
- Use the product scope as the source of truth.
- Do not invent new scope, examples, product behavior, or implementation details.
- Do not mention repository, hackathon, credentials, or private strategy.
- Keep the writing clear, business-grounded, and precise.
- Use Markdown.
- The output should be a standalone feature explanation.
- Include sections only when they help clarity.

# Output
Return only the final Markdown document for this feature.
`.trim();
}

function normalizeMarkdown(text) {
  return text
    .trim()
    .replace(/^```(?:md|markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

async function callDeepSeek({ apiKey, model, prompt, temperature, maxTokens, maxRetries }) {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    let response;
    try {
      response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature,
          max_tokens: maxTokens,
        }),
      });
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await wait(backoffMs(attempt));
      continue;
    }

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`DeepSeek returned non-JSON response (${response.status}): ${text.slice(0, 500)}`);
    }

    if (response.ok) {
      return normalizeMarkdown(json.choices?.[0]?.message?.content || "");
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === maxRetries) {
      throw new Error(`DeepSeek error ${response.status}: ${JSON.stringify(json.error || json)}`);
    }
    await wait(backoffMs(attempt));
  }

  throw new Error("DeepSeek call failed.");
}

function backoffMs(attempt) {
  return Math.min(30000, 1000 * 2 ** (attempt - 1));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPool(items, concurrency, worker) {
  const results = [];
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        await worker(items[index], index);
        results[index] = { ok: true, item: items[index] };
      } catch (error) {
        results[index] = { ok: false, item: items[index], error };
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, runWorker));
  return results;
}

async function main() {
  await loadEnv();
  const args = parseArgs(process.argv.slice(2));
  validateArgs(args);

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey && !args.dryRun) {
    throw new Error("DEEPSEEK_API_KEY is required unless --dry-run is used.");
  }

  const [scope, philosophy] = await Promise.all([
    readFile(args.scopeFile, "utf8"),
    readFile(args.philosophyFile, "utf8"),
  ]);
  const features = selectFeatures(args);

  await Promise.all([mkdir(args.outputDir, { recursive: true }), mkdir(args.promptDir, { recursive: true })]);

  const results = await runPool(features, args.concurrency, async (feature) => {
    const prompt = buildPrompt({ scope, philosophy, feature });
    const promptFile = path.join(args.promptDir, `${feature.slug}.prompt.md`);
    const outputFile = path.join(args.outputDir, `${feature.slug}.md`);

    await writeFile(promptFile, prompt, "utf8");

    if (!args.force && (await pathExists(outputFile))) {
      console.log(`skip ${feature.slug}: output exists`);
      return;
    }

    if (args.dryRun) {
      console.log(`prompt ${feature.slug}: ${promptFile}`);
      return;
    }

    const markdown = await callDeepSeek({
      apiKey,
      model: args.model,
      prompt,
      temperature: args.temperature,
      maxTokens: args.maxTokens,
      maxRetries: args.maxRetries,
    });

    await writeFile(outputFile, `${markdown}\n`, "utf8");
    console.log(`wrote ${outputFile}`);
  });

  const failures = results.filter((result) => !result.ok);
  if (failures.length) {
    for (const failure of failures) {
      console.error(`failed ${failure.item.slug}: ${failure.error.message}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
