Goal:
Identify which reference data is needed to compare the user's verification answer.

Instructions:
- Use only allowed customer reference data.
- Select the smallest set of reference categories needed.
- Do not request unrelated or unavailable data.

Expected output:
Maximum output length: 40 tokens.
Return compact JSON:
{
  "referenceNeed": ["address", "lastTransaction"]
}
