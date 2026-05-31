import { readFile } from "node:fs/promises";

export async function loadEnvFiles(files = ["../.env", ".env"]) {
  for (const file of files) {
    await loadEnvFile(file);
  }
}

async function loadEnvFile(file) {
  let raw;
  try {
    raw = await readFile(file, "utf8");
  } catch {
    return;
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
