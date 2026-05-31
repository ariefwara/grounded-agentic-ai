import { spawnSync } from "node:child_process";

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
    async generateAnswer({ approvedAnswer, userMessage }) {
      return approvedAnswer || `LLM is not configured. User asked: ${userMessage}`;
    },
  };
}

function createMockClient() {
  return {
    enabled: true,
    async generateAnswer({ approvedAnswer, userMessage }) {
      return approvedAnswer || `Mock answer for: ${userMessage}`;
    },
  };
}

function createOpenAiCompatibleClient({ apiKey, model, baseUrl, temperature }) {
  return {
    enabled: true,
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
  return {
    enabled: true,
    async generateAnswer(input) {
      const token = getGcloudAccessToken();
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

function getGcloudAccessToken() {
  const result = spawnSync("gcloud", ["auth", "print-access-token"], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error("Unable to get gcloud access token.");
  }

  return result.stdout.trim();
}

function buildMessages(input) {
  if (!input.approvedAnswer) {
    return [
      {
        role: "system",
        content: "You are a helpful assistant. Answer the user's general question clearly and briefly.",
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
      content:
        "You are an assistant for business communication. Answer only within the approved answer boundary. Do not add commitments, policy changes, or private information.",
    },
    {
      role: "user",
      content: buildPrompt(input),
    },
  ];
}

function buildPrompt({ userMessage, approvedAnswer, questionTitle }) {
  if (!approvedAnswer) {
    return [
      "Jawab pertanyaan pengguna secara singkat, jelas, dan lengkap.",
      "Gunakan bahasa Indonesia.",
      "Utamakan satu kalimat pendek.",
      "Jika satu kalimat tidak cukup untuk menjawab dengan benar, boleh gunakan beberapa kalimat pendek.",
      "Jangan berhenti di tengah kalimat.",
      "",
      `Pertanyaan pengguna: ${userMessage}`,
    ].join("\n");
  }

  return [
    `User message: ${userMessage}`,
    `Matched question: ${questionTitle || "unknown"}`,
    `Approved answer boundary: ${approvedAnswer}`,
    "Return only the final assistant message.",
  ].join("\n");
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
