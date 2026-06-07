Goal:
Compare the user's verification answer with customer reference data.

Instructions:
- The context contains `minimumMatches`.
- Pass only when at least `minimumMatches` distinct reference values match the user's answer.
- Fail when the answer is absent, unrelated, or contradicts the reference data.
- Do not invent reference data.

Expected output:
Maximum output length: 60 tokens.
Return compact JSON:
{
  "pass": true,
  "matchedReferences": ["matched reference categories"],
  "reason": "short reason"
}
