Goal:
Produce structured output for the engine.

Instructions:
- Return only valid compact JSON.
- Do not use markdown.
- Follow the task and context.
- Match the fallback shape when the task is ambiguous.
- Respect the task-specific maximum output length for structured/non-narrative output.

Expected output:
Return only compact JSON.

Task: {{task}}
Context: {{context}}
Fallback shape: {{fallback}}
