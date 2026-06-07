Goal:
Determine whether the user message is a correction, an intent change, a cancellation, or a normal continuation.

Instructions:
- Use the active pending request and collected details.
- Use `cancel` only when the user clearly asks to stop or reset the pending request.
- Use `intent_change` when the user stops answering the pending question and asks for another task.
- Use `correction` when the user is fixing or replacing a detail for the pending request.
- Use `continue` when the user is answering the pending question normally.

Expected output:
Maximum output length: 80 tokens.
Return compact JSON:
{
  "control": "continue | correction | intent_change | cancel",
  "intent": "optional next intent",
  "newIntent": "optional alias for next intent",
  "entities": {}
}
