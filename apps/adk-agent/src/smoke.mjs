import { callBusinessEngine } from './engine-client.mjs';

const message = process.argv.slice(2).join(' ') || 'Hi.';
const result = await callBusinessEngine({
  message,
  sessionId: `adk-smoke-${Date.now()}`,
});

console.log(JSON.stringify(result, null, 2));

if (result.status !== 'success' || !result.answer) {
  process.exitCode = 1;
}
