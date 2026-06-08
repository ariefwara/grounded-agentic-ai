import { readFile } from "node:fs/promises";
import path from "node:path";

const POLICY_FILES = {
  standardResponses: "standard-responses.json",
};

export async function loadPolicyBundle(baseDir) {
  const entries = await Promise.all(
    Object.entries(POLICY_FILES).map(async ([key, file]) => {
      const raw = await readFile(path.join(baseDir, file), "utf8");
      return [key, JSON.parse(raw)];
    }),
  );

  const bundle = Object.fromEntries(entries);
  validatePolicyBundle(bundle);
  return bundle;
}

function validatePolicyBundle(bundle) {
  if (!Array.isArray(bundle.standardResponses)) {
    throw new Error("Policy bundle is missing array: standardResponses");
  }

  for (const item of bundle.standardResponses) {
    if (!item.id || typeof item.id !== "string") {
      throw new Error("Every standardResponses item must have a string id.");
    }
    if (!item.message || typeof item.message !== "string") {
      throw new Error("Every standardResponses item must have a string message.");
    }
  }
}
