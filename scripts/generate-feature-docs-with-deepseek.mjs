import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BASE_PROMPT = "scripts/documentation/feature-writing.prompt.md";
const DEFAULT_OUTLINE_DIR = "scripts/documentation/features";
const DEFAULT_OUTPUT_DIR = "docs/features";
const DEFAULT_MODEL = "deepseek-chat";
const DEFAULT_MAX_RETRIES = 6;
const DEFAULT_CONCURRENCY = 2;
const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));

function resolveProjectPath(file) {
  return path.isAbsolute(file) ? file : path.resolve(PROJECT_ROOT, file);
}

function parseArgs(argv) {
  const args = {
    basePrompt: DEFAULT_BASE_PROMPT,
    outlineDir: DEFAULT_OUTLINE_DIR,
    outputDir: DEFAULT_OUTPUT_DIR,
    model: null,
    temperature: null,
    maxRetries: null,
    concurrency: null,
    target: null,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--base-prompt") args.basePrompt = argv[++index];
    else if (argument === "--outline-dir") args.outlineDir = argv[++index];
    else if (argument === "--output-dir") args.outputDir = argv[++index];
    else if (argument === "--model") args.model = argv[++index];
    else if (argument === "--temperature") args.temperature = Number(argv[++index]);
    else if (argument === "--max-retries") args.maxRetries = Number(argv[++index]);
    else if (argument === "--concurrency") args.concurrency = Number(argv[++index]);
    else if (argument === "--target") args.target = argv[++index];
    else if (argument === "--dry-run") args.dryRun = true;
    else if (argument === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/generate-feature-docs-with-deepseek.mjs
  node scripts/generate-feature-docs-with-deepseek.mjs --target guided-conversations
  node scripts/generate-feature-docs-with-deepseek.mjs --dry-run

Options:
  --base-prompt <file>    Shared narrative writing prompt.
  --outline-dir <dir>     Directory containing one Markdown outline per feature.
  --output-dir <dir>      Generated feature Markdown directory.
  --target <slug>         Generate one feature only.
  --model <name>          DeepSeek model.
  --temperature <number>  Generation temperature.
  --max-retries <number>  Retry attempts for transient failures.
  --concurrency <number>  Parallel DeepSeek requests.
  --dry-run               Validate inputs without calling DeepSeek.
`);
}

async function loadEnv() {
  try {
    const contents = await readFile(path.join(PROJECT_ROOT, ".env"), "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

      const separator = trimmed.indexOf("=");
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // Environment variables may be supplied by the caller.
  }
}

async function loadFeatures(outlineDir, target) {
  const resolvedOutlineDir = resolveProjectPath(outlineDir);
  const entries = await readdir(resolvedOutlineDir, { withFileTypes: true });
  const features = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => ({
      slug: entry.name.slice(0, -3),
      outlineFile: path.join(resolvedOutlineDir, entry.name),
    }))
    .sort((left, right) => left.slug.localeCompare(right.slug));

  if (!target) return features;

  const feature = features.find((item) => item.slug === target);
  if (!feature) {
    throw new Error(`Unknown feature "${target}". Available: ${features.map((item) => item.slug).join(", ")}`);
  }
  return [feature];
}

function buildPrompt(basePrompt, outline) {
  return `${basePrompt.trim()}

# Feature Outline

${outline.trim()}

# Output

Return only the final Markdown article for this feature.
`;
}

function normalizeMarkdown(text) {
  return text
    .trim()
    .replace(/^```(?:md|markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function backoffMs(attempt) {
  return Math.min(30000, 1000 * 2 ** (attempt - 1));
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function callDeepSeek({ apiKey, model, prompt, temperature, maxRetries }) {
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
        }),
      });
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await wait(backoffMs(attempt));
      continue;
    }

    const responseText = await response.text();
    let responseBody;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      throw new Error(`DeepSeek returned an invalid response (${response.status}).`);
    }

    if (response.ok) {
      const markdown = normalizeMarkdown(responseBody.choices?.[0]?.message?.content || "");
      if (!markdown.startsWith("# ")) {
        throw new Error("DeepSeek did not return a Markdown document with an H1 title.");
      }
      return markdown;
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === maxRetries) {
      throw new Error(`DeepSeek error ${response.status}: ${JSON.stringify(responseBody.error || responseBody)}`);
    }
    await wait(backoffMs(attempt));
  }

  throw new Error("DeepSeek generation failed.");
}

async function runPool(items, concurrency, worker) {
  const failures = [];
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      try {
        await worker(item);
      } catch (error) {
        failures.push({ item, error });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()),
  );
  return failures;
}

async function main() {
  await loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const model = args.model || process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;
  const temperature = args.temperature ?? Number(process.env.DEEPSEEK_TEMPERATURE || 0.45);
  const maxRetries = args.maxRetries ?? Number(process.env.DEEPSEEK_MAX_RETRIES || DEFAULT_MAX_RETRIES);
  const concurrency = args.concurrency ?? Number(process.env.DEEPSEEK_CONCURRENCY || DEFAULT_CONCURRENCY);

  if (!Number.isFinite(temperature) || temperature < 0) {
    throw new Error("temperature must be a non-negative number.");
  }
  if (!Number.isInteger(maxRetries) || maxRetries <= 0) {
    throw new Error("maxRetries must be a positive integer.");
  }
  if (!Number.isInteger(concurrency) || concurrency <= 0) {
    throw new Error("concurrency must be a positive integer.");
  }

  const [basePrompt, features] = await Promise.all([
    readFile(resolveProjectPath(args.basePrompt), "utf8"),
    loadFeatures(args.outlineDir, args.target),
  ]);

  if (args.dryRun) {
    console.log(`base prompt: ${args.basePrompt}`);
    console.log(`model: ${model}`);
    console.log(`features: ${features.map((feature) => feature.slug).join(", ")}`);
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is required.");

  const outputDir = resolveProjectPath(args.outputDir);
  await mkdir(outputDir, { recursive: true });
  const failures = await runPool(features, concurrency, async (feature) => {
    const outline = await readFile(feature.outlineFile, "utf8");
    const markdown = await callDeepSeek({
      apiKey,
      model,
      prompt: buildPrompt(basePrompt, outline),
      temperature,
      maxRetries,
    });
    const outputFile = path.join(outputDir, `${feature.slug}.md`);
    await writeFile(outputFile, `${markdown}\n`, "utf8");
    console.log(`wrote ${path.relative(PROJECT_ROOT, outputFile)}`);
  });

  if (failures.length > 0) {
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
