import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const promptRoot = resolve(process.cwd(), "prompts");
const cache = new Map();

export function renderPrompt(name, variables = {}) {
  const template = loadPrompt(name);
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key) => stringify(resolveValue(variables, key)));
}

function loadPrompt(name) {
  if (cache.has(name)) return cache.get(name);

  const file = resolve(promptRoot, `${name}.prompt.md`);
  const value = readFileSync(file, "utf8").trim();
  cache.set(name, value);
  return value;
}

function resolveValue(source, path) {
  return path.split(".").reduce((value, key) => (value == null ? "" : value[key]), source);
}

function stringify(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
