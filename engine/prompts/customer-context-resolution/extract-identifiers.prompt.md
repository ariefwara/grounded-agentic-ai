Goal:
Extract candidate customer identifiers from the user message.

Instructions:
- Extract only identifiers explicitly stated by the user.
- Do not infer missing identifiers.
- If no identifier exists, return an empty object.
Identifiers can include email, phone, account ID, customer number, or name.

Expected output:
Maximum output length: 80 tokens.
Return compact JSON:
{
  "identifiers": {
    "email": "optional",
    "phone": "optional",
    "accountId": "optional",
    "customerNumber": "optional",
    "name": "optional",
    "raw": "optional raw identifier"
  }
}
