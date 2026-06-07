import { spawn } from "node:child_process";
import process from "node:process";
import { Firestore } from "@google-cloud/firestore";
import { chromium } from "playwright-core";
import { simulationScenarios } from "./scenario-catalog.js";

const ROOT = new URL("../../..", import.meta.url).pathname;
const WEB_URL = process.env.WEB_CHAT_URL || "http://localhost:4200";
const CHROME_PATH = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const children = [];

async function main() {
  const scenario = selectScenario(process.argv[2]);
  console.log(`scenario: ${scenario.title}`);
  console.log(`story: ${scenario.story}`);
  console.log(`profile: ${scenario.profileId}`);
  await resetAndSeedFirestore(scenario);

  if (process.env.SIMULATOR_SEED_ONLY === "1") {
    console.log(`seed-only done: ${scenario.firestoreSimulationId}`);
    return;
  }

  startProcess("mock-api", "npm", ["start"], `${ROOT}/apps/mock-api`, {
    PORT: "3002",
  });
  startProcess("engine", "npm", ["start"], `${ROOT}/engine`, {
    FIRESTORE_SIMULATION_ID: scenario.firestoreSimulationId,
    ENGINE_PROFILE_ID: scenario.profileId,
    EXTERNAL_API_URL: process.env.EXTERNAL_API_URL || "http://localhost:3002",
    DELTAWAY_API_URL: process.env.DELTAWAY_API_URL || "http://localhost:3002",
    MEDIGREEN_PRESCRIBER_API_URL: process.env.MEDIGREEN_PRESCRIBER_API_URL || "http://localhost:3002",
    GATE_SEMANTIC_QUESTION_MATCH: "off",
    GATE_INFORMATION_CLASSIFICATION: "off",
    GATE_INFORMATION_ELIGIBILITY: "off",
    GATE_ACTION_ELIGIBILITY: "off",
    GATE_ANSWER_BOUNDARY: "off",
    GATE_LLM_RESPONSE: "on",
    GATE_RESPONSE_EVALUATION: "off",
    ENGINE_TIMING_LOG: "on",
  });
  startProcess("web-chat", "npm", ["start"], `${ROOT}/apps/web-chat`);

  try {
    await waitForHttp("http://localhost:3002/health");
    await waitForEngineProfile("http://localhost:3000/health", scenario.profileId);
    await waitForHttp(WEB_URL);
    await runBrowserScenario(scenario);
  } finally {
    await stopChildren();
  }
}

async function runBrowserScenario(scenario) {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: false,
    args: ["--new-window", "--start-maximized"],
  });

  try {
    const context = await browser.newContext({ viewport: null });
    await context.addInitScript(
      ({ profileId, sessionId }) => {
        window.localStorage.setItem("web-chat-profile-id", profileId);
        window.localStorage.setItem("web-chat-session-id", sessionId);
      },
      {
        profileId: scenario.profileId,
        sessionId: `simulation-${scenario.id}-${Date.now()}`,
      },
    );

    const page = await context.newPage();
    await page.goto(`${WEB_URL}?profile=${encodeURIComponent(scenario.profileId)}`, { waitUntil: "networkidle" });
    await installReplyListener(page);

    for (const [index, question] of scenario.questions.entries()) {
      const requestId = `${scenario.id}-${index + 1}`;
      console.log(`ask ${index + 1}/${scenario.questions.length}: ${question}`);
      await sendQuestionThroughInput(page, { requestId, message: question });
      const answer = await waitForReply(page, requestId);
      console.log(`answer ${index + 1}/${scenario.questions.length}: ${answer}`);
      if (index < scenario.questions.length - 1) {
        await sleep(randomDelay(500, 900));
      }
    }

    await sleep(10_000);
  } finally {
    await browser.close();
  }
}

async function resetAndSeedFirestore(scenario) {
  const firestore = new Firestore({
    projectId: process.env.FIRESTORE_PROJECT_ID || process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
    databaseId: process.env.FIRESTORE_DATABASE_ID || "(default)",
  });
  const root = firestore.collection("simulationDatabases").doc(scenario.firestoreSimulationId);

  console.log(`reset firestore simulation db: ${scenario.firestoreSimulationId}`);
  await firestore.recursiveDelete(root).catch(() => undefined);
  await root.set({
    scenarioId: scenario.id,
    title: scenario.title,
    story: scenario.story,
    profileId: scenario.profileId,
    seededAt: new Date().toISOString(),
  });

  await writeCollection(root, "customers", scenario.seed.customers);
  await writeCollection(root, "policies", scenario.seed.policies);
  await writeCollection(root, "documents", scenario.seed.documents);
  await writeCollection(root, "records", scenario.seed.records);
  await writeCollection(root, "requirementSchemas", [
    { id: "data_lookup", requiredSlots: ["topic"] },
    { id: "document_lookup", requiredSlots: ["documentTopic"] },
    { id: "action", requiredSlots: ["actionName"] },
  ]);
  await root.collection("state").doc("actionCounter").set({
    prefix: scenario.actionState.prefix,
    nextNumber: scenario.actionState.nextNumber,
  });
}

async function writeCollection(root, name, records) {
  if (!records.length) return;
  const batch = root.firestore.batch();
  for (const record of records) {
    const { id, ...data } = record;
    batch.set(root.collection(name).doc(id), data);
  }
  await batch.commit();
}

function selectScenario(id) {
  if (!id) {
    throw new Error(`Scenario is required. Available: ${simulationScenarios.map((item) => item.id).join(", ")}`);
  }
  const scenario = simulationScenarios.find((item) => item.id === id);
  if (scenario) return scenario;
  throw new Error(`Unknown scenario "${id}". Available: ${simulationScenarios.map((item) => item.id).join(", ")}`);
}

function startProcess(label, command, args, cwd, env = {}) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  children.push(child);
  child.stdout.on("data", (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${label}] ${chunk}`));
  return child;
}

async function stopChildren() {
  const exits = [];
  for (const child of children.toReversed()) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    exits.push(waitForExit(child));
    killProcessGroup(child, "SIGTERM");
  }

  await Promise.race([Promise.allSettled(exits), sleep(2_000)]);
  for (const child of children.toReversed()) {
    if (child.exitCode === null && child.signalCode === null) {
      killProcessGroup(child, "SIGKILL");
    }
  }
  await Promise.allSettled(exits);
}

function killProcessGroup(child, signal) {
  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

function waitForExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => child.once("exit", resolve));
}

async function waitForHttp(url, timeoutMs = 45_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The service is still starting.
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForEngineProfile(url, expectedProfileId, timeoutMs = 45_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const health = await response.json();
        if (health.profileId !== expectedProfileId) {
          throw new Error(`Engine profile mismatch: expected "${expectedProfileId}", received "${health.profileId}".`);
        }
        return;
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Engine profile mismatch:")) throw error;
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for engine profile "${expectedProfileId}".`);
}

async function installReplyListener(page) {
  await page.evaluate(() => {
    window.__simulationReplies = {};
    window.addEventListener("SIMULATION_ASSISTANT_REPLY", (event) => {
      window.__simulationReplies[event.detail.requestId] = event.detail.answer;
    });
  });
}

async function sendQuestionThroughInput(page, { requestId, message }) {
  const words = message.split(/(\s+)/).filter(Boolean);
  for (const word of words) {
    await page.evaluate((value) => {
      window.postMessage({ type: "SIMULATION_TYPE_WORD", value }, window.location.origin);
    }, word);
    await sleep(randomDelay(35, 80));
  }

  await page.evaluate(
    ({ requestId: id, message: text }) => {
      window.postMessage({ type: "SIMULATION_SUBMIT_MESSAGE", requestId: id, message: text }, window.location.origin);
    },
    { requestId, message },
  );
}

async function waitForReply(page, requestId) {
  await page.waitForFunction((id) => Boolean(window.__simulationReplies?.[id]), requestId, { timeout: 120_000 });
  return page.evaluate((id) => window.__simulationReplies[id], requestId);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(minMs, maxMs) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

main().catch(async (error) => {
  console.error(error.message);
  await stopChildren();
  process.exitCode = 1;
});
