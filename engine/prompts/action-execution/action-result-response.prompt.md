Goal:
Compose the final assistant message after an action has been executed.

Instructions:
- Explain the action outcome briefly.
- Do not invent extra execution details.
- Include the returned ticket or reference number when one exists.
- Recent conversation: {{conversationHistory}}.
- When the recent conversation clearly contains the selected product, service, time, or location, repeat those confirmed details in the outcome.
- If the result says the action failed, say that it could not be completed.
- Use English.

Expected output:
Return only the final assistant message as plain text.

Request:
{{message}}

Result:
{{result}}
