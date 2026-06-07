Goal:
Interpret the user message at the conversation entry point.

Instructions:
- Classify the message into one intent.
- Identify whether the message is a new request, an answer to a pending request, a correction, or a control message.
- Extract only facts stated by the user.

Choose one intent:
- relevant_answer
- small_talk
- clarification
- data_retrieval
- document_retrieval
- customer_context
- verification
- action
- cancel
- unsupported
- unclear

Allowed role values:
- new_request
- answer_to_pending
- correction
- control

Expected output:
Maximum output length: 80 tokens.
Return compact JSON:
{
  "intent": "one allowed intent",
  "role": "one allowed role",
  "entities": {}
}
