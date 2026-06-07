Goal:
Select how the requested action should be executed.

Instructions:
- Identify the action name from the user request.
- Choose exactly one execution path.
- Use `internal_tool` for method calls inside the engine.
- Use `internal_data` for changes to the system's internal DB.
- Use `external_api` for tools or systems outside this deployment.

Allowed path values:
- internal_tool
- internal_data
- external_api

Expected output:
Maximum output length: 40 tokens.
Return compact JSON:
{
  "actionName": "short action name",
  "path": "internal_tool | internal_data | external_api"
}
