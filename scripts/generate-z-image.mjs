import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));
const DEFAULT_MODEL = "fal-ai/z-image/turbo/lora";
const DEFAULT_OUTPUT_DIR = "output/images";
const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1350;
const MODELS_URL = "https://api.fal.ai/v1/models";
const RUN_URL = "https://fal.run";

function parseArgs(argv) {
  const args = {
    prompt: null,
    promptFile: null,
    model: null,
    output: null,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--prompt") args.prompt = argv[++index];
    else if (argument === "--prompt-file") args.promptFile = argv[++index];
    else if (argument === "--model") args.model = argv[++index];
    else if (argument === "--output") args.output = argv[++index];
    else if (argument === "--width") args.width = Number(argv[++index]);
    else if (argument === "--height") args.height = Number(argv[++index]);
    else if (argument === "--dry-run") args.dryRun = true;
    else if (argument === "--help" || argument === "-h") {
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
  node scripts/generate-z-image.mjs --prompt "A cinematic customer service scene"
  node scripts/generate-z-image.mjs --prompt-file prompts/image.txt --output output/images/result.png

Options:
  --prompt <text>       Image prompt.
  --prompt-file <file>  Read the prompt from a UTF-8 text file.
  --model <id>          FAL endpoint. Default: FAL_IMAGE_MODEL or ${DEFAULT_MODEL}
  --output <file>       Destination image file.
  --width <pixels>      Requested width. Default: ${DEFAULT_WIDTH}
  --height <pixels>     Requested height. Default: ${DEFAULT_HEIGHT}
  --dry-run             Validate configuration and print the request without calling FAL.
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

async function resolvePrompt(args) {
  if (args.prompt && args.promptFile) {
    throw new Error("Use either --prompt or --prompt-file, not both.");
  }
  if (args.promptFile) {
    return (await readFile(resolveProjectPath(args.promptFile), "utf8")).trim();
  }
  return String(args.prompt || "").trim();
}

function resolveProjectPath(file) {
  return path.isAbsolute(file) ? file : path.resolve(PROJECT_ROOT, file);
}

function requirePositiveInteger(value, name) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
}

async function falFetch(url, options = {}) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is required.");

  const timeoutMs = Number(process.env.FAL_TIMEOUT_MS || 120_000);
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      authorization: `Key ${key}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`FAL request failed (${response.status}): ${body.slice(0, 500)}`);
  }
  return response;
}

function resolveSchema(openapi, schema) {
  if (!schema?.$ref) return schema;
  const name = schema.$ref.split("/").at(-1);
  return openapi?.components?.schemas?.[name];
}

function findInputSchema(model) {
  for (const operations of Object.values(model.openapi?.paths || {})) {
    const schema = operations.post?.requestBody?.content?.["application/json"]?.schema;
    if (schema) return resolveSchema(model.openapi, schema);
  }
  return null;
}

async function getModel(modelId) {
  const url = new URL(MODELS_URL);
  url.searchParams.set("endpoint_id", modelId);
  url.searchParams.set("expand", "openapi-3.0");
  const data = await (await falFetch(url)).json();
  const model = data.models?.find((candidate) => candidate.endpoint_id === modelId);
  if (!model) throw new Error(`FAL model is unavailable: ${modelId}`);
  return model;
}

function buildInput({ prompt, width, height }, model) {
  const schema = findInputSchema(model);
  const properties = schema?.properties || {};
  if (!properties.prompt) throw new Error("The selected endpoint does not accept a text prompt.");

  const input = { prompt };
  if (properties.num_images) input.num_images = 1;

  if (properties.image_size) {
    const options = properties.image_size.anyOf || [properties.image_size];
    const supportsObjectSize = options.some(
      (option) => resolveSchema(model.openapi, option)?.type === "object",
    );
    if (!supportsObjectSize) {
      throw new Error("The selected endpoint does not support an exact width and height.");
    }
    input.image_size = { width, height };
  } else if (properties.aspect_ratio) {
    const ratio = `${width}:${height}`;
    const accepted = properties.aspect_ratio.enum || [];
    if (accepted.length > 0 && !accepted.includes(ratio)) {
      throw new Error(`The selected endpoint does not accept aspect ratio ${ratio}.`);
    }
    input.aspect_ratio = ratio;
  } else {
    throw new Error("The selected endpoint exposes no supported image size input.");
  }

  return input;
}

function findImage(result) {
  return result.images?.[0] || result.image || result.output?.images?.[0] || result.output?.image;
}

function defaultOutput(modelId, contentType = "image/png") {
  const extension = contentType.includes("jpeg") ? "jpg" : "png";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const model = modelId.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return path.join(DEFAULT_OUTPUT_DIR, `z-image-${model}-${timestamp}.${extension}`);
}

async function main() {
  await loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const prompt = await resolvePrompt(args);
  const modelId = args.model || process.env.FAL_IMAGE_MODEL || DEFAULT_MODEL;

  if (!prompt) throw new Error("--prompt or --prompt-file is required.");
  requirePositiveInteger(args.width, "width");
  requirePositiveInteger(args.height, "height");

  const model = await getModel(modelId);
  const input = buildInput({ prompt, width: args.width, height: args.height }, model);

  if (args.dryRun) {
    console.log(JSON.stringify({ model: modelId, input, output: args.output || DEFAULT_OUTPUT_DIR }, null, 2));
    return;
  }

  const result = await (
    await falFetch(`${RUN_URL}/${modelId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    })
  ).json();

  const image = findImage(result);
  if (!image?.url) throw new Error("FAL did not return an image URL.");

  const imageResponse = await fetch(image.url, {
    signal: AbortSignal.timeout(Number(process.env.FAL_TIMEOUT_MS || 120_000)),
  });
  if (!imageResponse.ok) {
    throw new Error(`Image download failed (${imageResponse.status}).`);
  }

  const contentType = image.content_type || imageResponse.headers.get("content-type") || "image/png";
  const output = resolveProjectPath(args.output || defaultOutput(modelId, contentType));
  const metadataFile = `${output}.json`;
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, Buffer.from(await imageResponse.arrayBuffer()));
  await writeFile(
    metadataFile,
    `${JSON.stringify(
      {
        model: modelId,
        prompt,
        width: args.width,
        height: args.height,
        contentType,
        sourceUrl: image.url,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );

  console.log(`image: ${path.relative(PROJECT_ROOT, output)}`);
  console.log(`metadata: ${path.relative(PROJECT_ROOT, metadataFile)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
