Goal:
Identify the document lookup scope for the user's request.

Instructions:
- Extract the document topic, policy name, product name, or other search scope.
- Use only what is stated or strongly implied by the user request.
- If the scope is unclear, return a broad topic from the request.

Expected output:
Maximum output length: 40 tokens.
Return compact JSON:
{
  "topic": "document topic or search scope"
}
