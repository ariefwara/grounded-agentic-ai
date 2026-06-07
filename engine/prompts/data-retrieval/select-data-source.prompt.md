Goal:
Choose the data source needed to answer the user request.

Instructions:
- Use `internal` for data owned by this system in DB.
- Use `external` for external API or tool data outside this system.
- Extract the search topic from the request.

Allowed source values:
- internal
- external

Expected output:
Maximum output length: 40 tokens.
Return compact JSON:
{
  "source": "internal | external",
  "topic": "search topic"
}
