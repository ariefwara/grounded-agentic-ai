Goal:
Extract available slot values from the user message.

Instructions:
- Use the required slot list and existing collected slots as context.
- Extract only values explicitly provided by the user.
- Preserve existing slots unless the user clearly corrects them.

Expected output:
Maximum output length: 80 tokens.
Return compact JSON:
{
  "slots": {}
}
