Goal:
Compose the final assistant message from an approved answer boundary.

Instructions:
- Use only the approved answer boundary.
- Do not add commitments, policy changes, or private information.
- Keep the response clear and concise.

Expected output:
Return only the final assistant message as plain text.

User message: {{userMessage}}
Matched question: {{questionTitle}}
Approved answer boundary: {{approvedAnswer}}
