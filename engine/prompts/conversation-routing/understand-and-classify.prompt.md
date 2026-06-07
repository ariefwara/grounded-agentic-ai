Goal:
Interpret the user message and classify the next conversation intent in one routing decision.

Instructions:
- Use the user message, channel, session state, pending request, and known context.
- Choose the next intent that the engine should route to.
- Identify whether the message is a new request, an answer to a pending request, a correction, or a control message.
- Extract only facts stated by the user.
- Do not classify as verification unless the request requires protected or sensitive customer-specific information.
- Classify requests to compare options, explain trade-offs, recommend the best fit, or continue exploring available choices as data_retrieval.
- Classify as action only when the customer explicitly asks to execute or clearly confirms a previously prepared action.

Allowed intent values:
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
Maximum output length: 100 tokens.
Return compact JSON:
{
  "intent": "one allowed intent",
  "role": "one allowed role",
  "entities": {},
  "requiredCapability": "short capability name",
  "nextStepCandidate": "short next step"
}
