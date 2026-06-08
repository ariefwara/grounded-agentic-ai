import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import process from "node:process";
import { Firestore } from "@google-cloud/firestore";
import { chromium } from "playwright-core";
import { simulationScenarios } from "./scenario-catalog.js";

const ROOT = new URL("../../..", import.meta.url).pathname;
const WEB_URL = process.env.WEB_CHAT_URL || "http://localhost:4200";
const CHROME_PATH = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const RECORDING_TAIL_MS = Number(process.env.SIMULATOR_RECORDING_TAIL_MS || 5_000);
const execFileAsync = promisify(execFile);
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
    FLIGHT_API_URL: process.env.FLIGHT_API_URL || "http://localhost:3002",
    PHARMACY_PRESCRIBER_API_URL: process.env.PHARMACY_PRESCRIBER_API_URL || "http://localhost:3002",
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
  await minimizeAllWindows();
  const recorder = await startScreenRecorder();
  let browser;

  try {
    browser = await chromium.launch({
      executablePath: CHROME_PATH,
      headless: false,
      args: ["--new-window"],
    });
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
    await placeBrowserWindow(browser, page);
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
    if (browser) await browser.close();
    await minimizeAllWindows();
    await sleep(RECORDING_TAIL_MS);
    await stopScreenRecorder(recorder);
  }
}

async function minimizeAllWindows() {
  if (process.platform !== "linux") return;
  await execFileAsync("wmctrl", ["-k", "on"]);
  await sleep(500);
}

async function placeBrowserWindow(browser, page) {
  const display = await page.evaluate(() => ({
    left: window.screen.availLeft,
    top: window.screen.availTop,
    width: window.screen.availWidth,
    height: window.screen.availHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  }));
  const margin = 20;
  const expectedBounds = {
    left: display.left + margin,
    top: display.top + margin,
    width: display.width - margin * 2,
    height: display.height - margin * 2,
  };

  const cdp = await page.context().newCDPSession(page);
  const { windowId } = await cdp.send("Browser.getWindowForTarget");
  await cdp.send("Browser.setWindowBounds", {
    windowId,
    bounds: { windowState: "normal" },
  });
  await cdp.send("Browser.setWindowBounds", {
    windowId,
    bounds: expectedBounds,
  });
  await sleep(500);

  const { bounds } = await cdp.send("Browser.getWindowBounds", { windowId });
  for (const key of ["left", "top", "width", "height"]) {
    if (Math.abs(bounds[key] - expectedBounds[key]) > 2) {
      throw new Error(
        `Browser placement mismatch for ${key}: expected ${expectedBounds[key]}, received ${bounds[key]}.`,
      );
    }
  }
}

async function startScreenRecorder() {
  const output = process.env.SIMULATOR_RECORD_OUTPUT;
  if (!output) return null;

  const screen = await getDesktopWorkArea();
  const sink = process.env.SIMULATOR_AUDIO_SINK || (await getDefaultAudioSink());
  const args = [
    "-y",
    "-thread_queue_size",
    "1024",
    "-f",
    "x11grab",
    "-framerate",
    "30",
    "-video_size",
    `${screen.width}x${screen.height}`,
    "-i",
    `${process.env.DISPLAY || ":0"}+${screen.left},${screen.top}`,
  ];
  if (sink) {
    args.push("-f", "pulse", "-i", `${sink}.monitor`);
  }
  args.push(
    "-vf",
    "scale=1920:970:flags=lanczos",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "19",
    "-pix_fmt",
    "yuv420p",
  );
  if (sink) args.push("-c:a", "aac", "-b:a", "192k");
  args.push("-movflags", "+faststart", output);

  const recorder = spawn("ffmpeg", args, {
    cwd: ROOT,
    stdio: ["pipe", "ignore", "pipe"],
  });
  let errorOutput = "";
  recorder.stderr.on("data", (chunk) => {
    errorOutput = `${errorOutput}${chunk}`.slice(-4000);
  });
  recorder.errorOutput = () => errorOutput;
  await sleep(1_000);
  if (recorder.exitCode !== null) {
    throw new Error(`Screen recorder failed to start: ${errorOutput}`);
  }
  console.log(`recording: ${output}`);
  return recorder;
}

async function getDesktopWorkArea() {
  const { stdout } = await execFileAsync("xprop", ["-root", "_NET_WORKAREA"]);
  const match = stdout.match(/=\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (!match) throw new Error("Could not determine the X11 desktop work area.");
  return {
    left: Number(match[1]),
    top: Number(match[2]),
    width: Number(match[3]),
    height: Number(match[4]),
  };
}

async function stopScreenRecorder(recorder) {
  if (!recorder || recorder.exitCode !== null) return;
  const exited = waitForExit(recorder);
  recorder.stdin.write("q");
  await Promise.race([exited, sleep(10_000)]);
  if (recorder.exitCode === null) recorder.kill("SIGTERM");
  await waitForExit(recorder);
  if (recorder.exitCode !== 0) {
    throw new Error(`Screen recorder failed: ${recorder.errorOutput()}`);
  }
}

async function getDefaultAudioSink() {
  if (process.platform !== "linux") return "";
  try {
    const { stdout } = await execFileAsync("pactl", ["get-default-sink"]);
    return stdout.trim();
  } catch {
    return "";
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
