export function createExternalApi({ integrations = {}, env = process.env } = {}) {
  return {
    async getContext({ capability, integrationId }) {
      return await execute(integrationId, { capability });
    },

    async queryData({ topic, integrationId }) {
      const result = await execute(integrationId, { topic });
      return {
        ...result,
        records: result.records || [],
      };
    },

    async callTool({ actionName, integrationId }) {
      if (!integrationId) {
        return {
          status: "unavailable",
          actionName,
          result: "No external integration is configured for this action.",
        };
      }
      return await execute(integrationId, { actionName });
    },
  };

  async function execute(integrationId, payload) {
    const integration = integrations[integrationId];
    if (!integration) {
      return {
        status: "unavailable",
        available: false,
        result: `External integration "${integrationId || "unspecified"}" is not configured.`,
      };
    }

    const baseUrl = String(env[integration.baseUrlEnv] || "").replace(/\/$/, "");
    if (!baseUrl) {
      return {
        status: "unavailable",
        available: false,
        result: `Environment variable ${integration.baseUrlEnv} is not configured.`,
      };
    }

    const headers = { "content-type": "application/json" };
    if (integration.authentication?.type === "bearer") {
      const token = env[integration.authentication.tokenEnv];
      if (!token) throw new Error(`Missing external API token: ${integration.authentication.tokenEnv}`);
      headers.authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${integration.operation.path}`, {
      method: integration.operation.method || "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(integration.timeoutMs || 10_000),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json.message || `External API request failed with ${response.status}`);
    }
    return json;
  }
}
