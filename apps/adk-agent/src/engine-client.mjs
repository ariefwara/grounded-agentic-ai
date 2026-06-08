const DEFAULT_ENGINE_URL = 'http://localhost:3000';

export async function callBusinessEngine({
  message,
  sessionId = 'adk-agent-default-session',
  channel = 'adk-agent',
  engineUrl = process.env.ENGINE_URL || DEFAULT_ENGINE_URL,
} = {}) {
  const baseUrl = String(engineUrl || DEFAULT_ENGINE_URL).replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/chat`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      channel,
      message: String(message || ''),
    }),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    return {
      status: 'error',
      error: payload.error || 'engine_error',
      message: payload.message || `Engine request failed with HTTP ${response.status}.`,
    };
  }

  return {
    status: 'success',
    requestId: payload.requestId,
    answer: payload.answer || '',
  };
}
