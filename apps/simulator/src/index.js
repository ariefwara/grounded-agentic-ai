import { spawn } from "node:child_process";
import process from "node:process";
import { chromium } from "playwright-core";

const ROOT = new URL("../../..", import.meta.url).pathname;
const WEB_URL = process.env.WEB_CHAT_URL || "http://localhost:4200";
const CHROME_PATH = process.env.CHROME_PATH || "/usr/bin/google-chrome";

const scenarios = [
  {
    id: "scenario-quick-5",
    title: "Quick general LLM pass-through flow",
    questions: [
      "Indonesia itu dimana?",
      "Apa ibu kota Indonesia?",
      "Apa bedanya laut dan samudra?",
      "Kenapa langit berwarna biru?",
      "Apa itu fotosintesis?",
    ],
  },
  {
    id: "scenario-1",
    title: "General LLM pass-through flow",
    questions: [
      "Indonesia itu dimana?",
      "Apa ibu kota Indonesia?",
      "Apa bedanya laut dan samudra?",
      "Kenapa langit berwarna biru?",
      "Apa itu fotosintesis?",
      "Bagaimana cara kerja hujan?",
      "Apa itu energi terbarukan?",
      "Apa manfaat membaca buku?",
      "Bagaimana cara membuat teh?",
      "Apa perbedaan kopi arabika dan robusta?",
      "Apa itu internet?",
      "Bagaimana email bekerja secara sederhana?",
      "Apa fungsi DNS?",
      "Apa itu cloud computing?",
      "Apa itu API?",
      "Apa itu database?",
      "Apa bedanya frontend dan backend?",
      "Apa itu JavaScript?",
      "Apa itu TypeScript?",
      "Apa itu Angular?",
      "Apa itu Docker?",
      "Apa itu Git?",
      "Bagaimana cara menjaga password tetap aman?",
      "Apa itu enkripsi?",
      "Apa itu autentikasi?",
      "Apa itu otorisasi?",
      "Apa itu machine learning?",
      "Apa bedanya AI dan machine learning?",
      "Apa itu model bahasa besar?",
      "Apa itu chatbot?",
      "Apa itu prompt?",
      "Bagaimana cara menulis prompt yang jelas?",
      "Apa itu ringkasan?",
      "Bagaimana cara belajar lebih efektif?",
      "Apa manfaat olahraga ringan?",
      "Apa itu pola makan seimbang?",
      "Kenapa tidur penting?",
      "Apa itu stres?",
      "Bagaimana cara mengatur waktu?",
      "Apa itu produktivitas?",
      "Apa itu komunikasi efektif?",
      "Apa itu empati?",
      "Apa itu kerja sama tim?",
      "Apa itu kepemimpinan?",
      "Apa itu ekonomi sederhana?",
      "Apa itu inflasi?",
      "Apa itu tabungan?",
      "Apa itu investasi?",
      "Apa itu risiko?",
      "Kenapa kita perlu belajar hal baru?",
    ],
  },
];

const children = [];

async function main() {
  const scenario = selectScenario(process.argv[2]);
  const engine = startProcess("engine", "npm", ["start"], `${ROOT}/engine`, {
    GATE_SEMANTIC_QUESTION_MATCH: "off",
    GATE_INFORMATION_CLASSIFICATION: "off",
    GATE_INFORMATION_ELIGIBILITY: "off",
    GATE_ACTION_ELIGIBILITY: "off",
    GATE_ANSWER_BOUNDARY: "off",
    GATE_LLM_RESPONSE: "on",
    GATE_RESPONSE_EVALUATION: "off",
  });
  const web = startProcess("web-chat", "npm", ["start"], `${ROOT}/apps/web-chat`);

  try {
    await waitForHttp("http://localhost:3000/health");
    await waitForHttp(WEB_URL);

    const browser = await chromium.launch({
      executablePath: CHROME_PATH,
      headless: false,
      args: ["--new-window", "--start-maximized"],
    });

    try {
      const context = await browser.newContext({ viewport: null });
      const page = await context.newPage();
      await page.goto(WEB_URL, { waitUntil: "networkidle" });
      await installReplyListener(page);

      for (const [index, question] of scenario.questions.entries()) {
        const requestId = `${scenario.id}-${index + 1}`;
        console.log(`ask ${index + 1}/${scenario.questions.length}: ${question}`);
        await sendQuestionThroughInput(page, { requestId, message: question });
        const answer = await waitForReply(page, requestId);
        console.log(`answer ${index + 1}/${scenario.questions.length}: ${answer}`);
        if (index < scenario.questions.length - 1) {
          await sleep(randomDelay(1_000, 2_000));
        }
      }
    } finally {
      await browser.close();
    }
  } finally {
    stopChildren();
    await sleep(500);
    process.exit(0);
  }
}

function selectScenario(id = "scenario-1") {
  const scenario = scenarios.find((item) => item.id === id);
  if (!scenario) {
    const available = scenarios.map((item) => item.id).join(", ");
    throw new Error(`Unknown scenario "${id}". Available: ${available}`);
  }
  return scenario;
}

function startProcess(label, command, args, cwd, env = {}) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);

  child.stdout.on("data", (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${label}] ${chunk}`));
  return child;
}

function stopChildren() {
  for (const child of children.toReversed()) {
    if (!child.killed) child.kill("SIGTERM");
  }
}

async function waitForHttp(url, timeoutMs = 45_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is not ready yet.
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
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
      window.postMessage(
        {
          type: "SIMULATION_TYPE_WORD",
          value,
        },
        window.location.origin,
      );
    }, word);
    await sleep(randomDelay(120, 260));
  }

  await page.evaluate(
    ({ requestId: id, message: text }) => {
      window.postMessage(
        {
          type: "SIMULATION_SUBMIT_MESSAGE",
          requestId: id,
          message: text,
        },
        window.location.origin,
      );
    },
    { requestId, message },
  );
}

async function waitForReply(page, requestId) {
  await page.waitForFunction(
    (id) => Boolean(window.__simulationReplies?.[id]),
    requestId,
    { timeout: 60_000 },
  );
  return page.evaluate((id) => window.__simulationReplies[id], requestId);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(minMs, maxMs) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

main().catch((error) => {
  stopChildren();
  console.error(error.message);
  process.exit(1);
});
