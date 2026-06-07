Goal:
Classify the interpreted message into the next conversation intent.

Instructions:
- Use the current session state, pending request, and extracted facts.
- Choose the next intent that the engine should route to.
- Do not classify as verification unless the request requires protected or sensitive customer-specific information.

Expected output:
Maximum output length: 100 tokens.
Return compact JSON:
{
  "intent": "relevant_answer | small_talk | clarification | data_retrieval | document_retrieval | customer_context | verification | action | cancel | unsupported | unclear",
  "role": "new_request | answer_to_pending | correction | control",
  "entities": {},
  "requiredCapability": "short capability name",
  "nextStepCandidate": "short next step"
}
