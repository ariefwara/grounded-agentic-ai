import { readFile } from "node:fs/promises";
import path from "node:path";
import { validatePolicyBundle } from "./policy-validator.js";

const POLICY_FILES = {
  canonicalQuestions: "canonical-questions.json",
  standardResponses: "standard-responses.json",
  informationClasses: "information-classes.json",
  eligibilityRules: "eligibility-rules.json",
  answerBoundaries: "answer-boundaries.json",
  actionRegistry: "action-registry.json",
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
