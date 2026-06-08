import { GoogleAuth } from "google-auth-library";
import { renderPrompt } from "../prompts/prompt-loader.js";

export function createLlmClient(env = process.env) {
  const provider = normalizeProvider(env.LLM_PROVIDER);
  const apiKey = resolveApiKey(provider, env);
  const model = resolveModel(provider, env);
  const temperature = Number(env.LLM_TEMPERATURE ?? 0.2);

  if (provider === "off") return createFallbackClient();
  if (provider === "mock") return createMockClient();

  if (provider === "vertex") {
    return createVertexClient({
      projectId: env.GCP_PROJECT || env.VERTEX_PROJECT || "ariefwrz",
      location: env.VERTEX_LOCATION || "global",
      model: env.LLM_MODEL || env.VERTEX_TEXT_MODEL || "gemini-2.5-flash",
      temperature,
    });
  }

  if (!apiKey || !model) return createFallbackClient();

  if (provider === "gemini") {
    return createGeminiClient({
      apiKey,
      model,
      baseUrl: env.LLM_BASE_URL || "https://generativelanguage.googleapis.com/v1beta",
      temperature,
    });
  }

  return createOpenAiCompatibleClient({
    apiKey,
    model,
    baseUrl: resolveOpenAiBaseUrl(provider, env.LLM_BASE_URL),
    temperature,
  });
}

function normalizeProvider(provider) {
  return String(provider || "gemini").trim().toLowerCase();
}

function resolveApiKey(provider, env) {
  if (provider === "gemini") return env.LLM_API_KEY || env.GEMINI_API_KEY;
  return env.LLM_API_KEY;
}

function resolveModel(provider, env) {
  if (provider === "gemini") return env.LLM_MODEL || env.GEMINI_MODEL || "gemini-2.5-flash";
  if (provider === "vertex") return env.LLM_MODEL || env.VERTEX_TEXT_MODEL || "gemini-2.5-flash";
  return env.LLM_MODEL;
}

function resolveOpenAiBaseUrl(provider, configuredBaseUrl) {
  if (configuredBaseUrl) return configuredBaseUrl.replace(/\/$/, "");
  if (provider === "deepseek") return "https://api.deepseek.com";
  return "https://api.openai.com/v1";
}

function createFallbackClient() {
  return {
    enabled: false,
    async generateStructured({ fallback }) {
      return fallback || {};
    },
    async generateAnswer({ approvedAnswer, userMessage }) {
      return approvedAnswer || `LLM is not configured. User asked: ${userMessage}`;
    },
  };
}

function createMockClient() {
  return {
    enabled: true,
    async generateStructured({ fallback }) {
      return fallback || {};
    },
    async generateAnswer({ approvedAnswer, userMessage }) {
      return approvedAnswer || `Mock answer for: ${userMessage}`;
    },
  };
}

function createOpenAiCompatibleClient({ apiKey, model, baseUrl, temperature }) {
  return {
    enabled: true,
    async generateStructured(input) {
      const text = await this.generateAnswer({
        userMessage: buildStructuredPrompt(input),
        structured: true,
      });
      return parseStructuredText(text, input.fallback);
    },
    async generateAnswer(input) {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature,
          messages: buildMessages(input),
        }),
      });

      const json = await parseJsonResponse(response);
      return json.choices?.[0]?.message?.content?.trim() || input.approvedAnswer;
    },
  };
}

function createGeminiClient({ apiKey, model, baseUrl, temperature }) {
  return {
    enabled: true,
    async generateStructured(input) {
      const text = await this.generateAnswer({
        userMessage: buildStructuredPrompt(input),
        structured: true,
      });
      return parseStructuredText(text, input.fallback);
    },
    async generateAnswer(input) {
      const response = await fetch(
        `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            generationConfig: {
              temperature,
            },
            contents: [
              {
                role: "user",
                parts: [{ text: buildPrompt(input) }],
              },
            ],
          }),
        },
      );

      const json = await parseJsonResponse(response);
      return extractGeminiText(json) || input.approvedAnswer;
    },
  };
}

function createVertexClient({ projectId, location, model, temperature }) {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  return {
    enabled: true,
    async generateStructured(input) {
      const text = await this.generateAnswer({
        userMessage: buildStructuredPrompt(input),
        structured: true,
      });
      return parseStructuredText(text, input.fallback);
    },
    async generateAnswer(input) {
      const token = await getGoogleAccessToken(auth);
      const host = location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;
      const response = await fetch(
        `https://${host}/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
            "x-goog-user-project": projectId,
          },
          body: JSON.stringify({
            generationConfig: {
              temperature,
            },
            contents: [
              {
                role: "user",
                parts: [{ text: buildPrompt(input) }],
              },
            ],
          }),
        },
      );

      const json = await parseJsonResponse(response);
      return extractGeminiText(json) || input.approvedAnswer;
    },
  };
}

async function getGoogleAccessToken(auth) {
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token?.token) throw new Error("Unable to get Google access token.");
  return token.token;
}

function buildMessages(input) {
  if (!input.approvedAnswer) {
    return [
      {
        role: "system",
        content: renderPrompt("llm-wrapper/general-system"),
      },
      {
        role: "user",
        content: input.userMessage,
      },
    ];
  }

  return [
    {
      role: "system",
      content: renderPrompt("llm-wrapper/approved-answer-system"),
    },
    {
      role: "user",
      content: buildPrompt(input),
    },
  ];
}

function buildPrompt({ userMessage, approvedAnswer, questionTitle, structured }) {
  if (structured) {
    return userMessage;
  }

  if (!approvedAnswer) {
    return renderPrompt("llm-wrapper/general-answer-request", { userMessage });
  }

  return renderPrompt("llm-wrapper/approved-answer-request", {
    userMessage,
    questionTitle: questionTitle || "unknown",
    approvedAnswer,
  });
}

async function parseJsonResponse(response) {
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`LLM returned non-JSON response (${response.status})`);
  }

  if (!response.ok) {
    const message = json.error?.message || json.error || `LLM request failed with ${response.status}`;
    throw new Error(String(message));
  }

  return json;
}

function buildStructuredPrompt({ task, context, fallback }) {
  return renderPrompt("llm-wrapper/structured-json", {
    task,
    context,
    fallback: fallback || {},
  });
}

function parseStructuredText(text, fallback = {}) {
  const trimmed = String(text || "").trim();
  const jsonText = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(jsonText);
  } catch {
    const start = jsonText.indexOf("{");
    const end = jsonText.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(jsonText.slice(start, end + 1));
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

function extractGeminiText(json) {
  return (
    json.candidates
      ?.flatMap((candidate) => candidate.content?.parts || [])
      .map((part) => part.text || "")
      .filter(Boolean)
      .join("")
      .trim() || ""
  );
}
