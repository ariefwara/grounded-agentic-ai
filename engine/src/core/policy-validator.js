const REQUIRED_COLLECTIONS = [
  "canonicalQuestions",
  "standardResponses",
  "informationClasses",
  "eligibilityRules",
  "answerBoundaries",
  "actionRegistry",
];

export function validatePolicyBundle(bundle) {
  for (const key of REQUIRED_COLLECTIONS) {
    if (!Array.isArray(bundle[key])) {
      throw new Error(`Policy bundle is missing array: ${key}`);
    }
  }

  requireIds(bundle.canonicalQuestions, "canonicalQuestions");
  requireIds(bundle.standardResponses, "standardResponses");
  requireIds(bundle.informationClasses, "informationClasses");
  requireIds(bundle.eligibilityRules, "eligibilityRules");
  requireIds(bundle.answerBoundaries, "answerBoundaries");
  requireIds(bundle.actionRegistry, "actionRegistry");
}

function requireIds(items, collectionName) {
  for (const item of items) {
    if (!item.id || typeof item.id !== "string") {
      throw new Error(`Every ${collectionName} item must have a string id.`);
    }
  }
}
