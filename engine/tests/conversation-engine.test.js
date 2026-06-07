import assert from "node:assert/strict";
import test from "node:test";
import { createArizeEvaluator } from "../src/arize/arize-evaluator.js";
import { createExternalApi } from "../src/api/external-api.js";
import { createConversationEngine } from "../src/conversation/conversation-engine.js";
import { createSessionStore } from "../src/session/session-store.js";
import { createInternalTools } from "../src/tools/internal-tools.js";

test("answers a relevant direct conversation turn", async () => {
  const engine = createTestConversationEngine();

  const result = await engine.chat({
    requestId: "chat-001",
    sessionId: "session-001",
    message: "Apa itu refund?",
  });

  assert.equal(result.requestId, "chat-001");
  assert.match(result.answer, /refund/i);
});

test("introduces configured capabilities when the customer greets the assistant", async () => {
  const engine = createTestConversationEngine({
    profile: {
      brand: "Deltaway Air",
      offers: ["search flights", "create a booking", "manage an existing trip"],
    },
  });

  const result = await engine.chat({
    requestId: "welcome-1",
    sessionId: "welcome-session",
    message: "Hi.",
  });

  assert.match(result.answer, /Deltaway Air/);
  assert.match(result.answer, /search flights/);
  assert.match(result.answer, /create a booking/);
  assert.match(result.answer, /manage an existing trip/);
});

test("rejects unrelated general knowledge", async () => {
  const engine = createTestConversationEngine();

  const result = await engine.chat({
    requestId: "chat-unrelated",
    sessionId: "session-unrelated",
    message: "Indonesia itu dimana?",
  });

  assert.equal(result.requestId, "chat-unrelated");
  assert.match(result.answer, /not supported|tidak didukung|cannot support/i);
});

test("does not treat pembatalan as cancel command", async () => {
  const engine = createTestConversationEngine();

  const result = await engine.chat({
    requestId: "chat-cancellation-topic",
    sessionId: "session-cancellation-topic",
    message: "Apa bedanya refund dan pembatalan?",
  });

  assert.notEqual(result.answer, "Okay, I cancelled the pending request.");
  assert.match(result.answer, /refund|pembatalan/i);
});

test("retrieves internal data before composing an answer", async () => {
  const engine = createTestConversationEngine();

  const result = await engine.chat({
    requestId: "chat-002",
    sessionId: "session-002",
    message: "cari data refund policy",
  });

  assert.equal(result.requestId, "chat-002");
  assert.match(result.answer, /Refund Policy|refund/i);
});

test("executes an internal tool action", async () => {
  const engine = createTestConversationEngine();

  const result = await engine.chat({
    requestId: "chat-003",
    sessionId: "session-003",
    message: "buat case refund",
  });

  assert.equal(result.requestId, "chat-003");
  assert.match(result.answer, /Internal method completed/);
});

test("uses the profile action path for a natural customer confirmation", async () => {
  let internalWrites = 0;
  let externalCalls = 0;
  const db = createTestDb();
  db.executeDataChange = async () => {
    internalWrites += 1;
    return { status: "completed", result: "Internal booking created.", ticketId: "BOOK-1" };
  };
  const api = {
    async queryData() {
      return { records: [] };
    },
    async callTool() {
      externalCalls += 1;
      return { status: "completed", result: "External booking changed." };
    },
  };
  const engine = createTestConversationEngine({
    db,
    api,
    profile: {
      action: { name: "change flight booking", path: "external_api" },
    },
  });

  const result = await engine.chat({
    requestId: "chat-profile-action",
    sessionId: "session-profile-action",
    message: "Yes, change it.",
  });

  assert.equal(internalWrites, 0);
  assert.equal(externalCalls, 1);
  assert.equal(typeof result.answer, "string");
});

test("passes recent conversation to the action result response", async () => {
  let actionPrompt = "";
  const llmClient = createTestLlmClient();
  llmClient.generateAnswer = async ({ userMessage }) => {
    actionPrompt = String(userMessage);
    return "Order ORD-1 was created.";
  };
  const engine = createTestConversationEngine({
    llmClient,
    profile: { action: { name: "place pickup purchase", path: "internal_data" } },
  });

  await engine.chat({ sessionId: "action-context-session", message: "I want the CrispPro at Austin Central." });
  await engine.chat({ sessionId: "action-context-session", message: "Yes, place it." });

  assert.match(actionPrompt, /CrispPro/);
  assert.match(actionPrompt, /Austin Central/);
});

test("does not execute a configured action before explicit confirmation", async () => {
  let externalCalls = 0;
  const engine = createTestConversationEngine({
    llmClient: createTestLlmClient({
      structuredOverride() {
        return { intent: "action", role: "new_request", entities: { destination: "Seattle" } };
      },
    }),
    api: {
      async queryData() {
        return { records: [] };
      },
      async callTool() {
        externalCalls += 1;
        return { status: "completed" };
      },
    },
    profile: {
      brand: "Deltaway Air",
      dataSource: "internal",
      action: { name: "create flight booking", path: "external_api" },
    },
  });

  await engine.chat({
    requestId: "chat-guided-action",
    sessionId: "session-guided-action",
    message: "I need to go to Seattle.",
  });

  assert.equal(externalCalls, 0);
});

test("does not execute an action from a decision question", async () => {
  let externalCalls = 0;
  const engine = createTestConversationEngine({
    api: {
      async queryData() {
        return { records: [] };
      },
      async callTool() {
        externalCalls += 1;
        return { status: "completed" };
      },
    },
    profile: {
      brand: "Netflicks",
      dataSource: "internal",
      guidedResponses: true,
      action: { name: "open billing case", path: "external_api" },
    },
  });

  await engine.chat({ sessionId: "decision-action-session", message: "Hi." });
  await engine.chat({ sessionId: "decision-action-session", message: "Should I wait or open a case now?" });

  assert.equal(externalCalls, 0);
});

test("requires configured identification before protected data retrieval", async () => {
  const db = createTestDb();
  let queries = 0;
  db.queryData = async () => {
    queries += 1;
    return [];
  };
  const engine = createTestConversationEngine({
    db,
    profile: {
      brand: "Netflicks",
      identification: { mode: "customer", requiredBeforeData: true, fields: ["email"] },
    },
  });

  const result = await engine.chat({ sessionId: "protected-data-session", message: "Show my latest invoice." });

  assert.equal(queries, 0);
  assert.match(result.answer, /email|identifying/i);
});

test("collects configured identity before executing an action", async () => {
  let externalCalls = 0;
  const engine = createTestConversationEngine({
    api: {
      async queryData() {
        return { records: [] };
      },
      async callTool() {
        externalCalls += 1;
        return { status: "completed" };
      },
    },
    profile: {
      brand: "Deltaway Air",
      identification: { mode: "traveler", fields: ["name", "email"] },
      action: { name: "create flight booking", path: "external_api" },
    },
  });

  const result = await engine.chat({
    requestId: "chat-action-identification",
    sessionId: "session-action-identification",
    message: "Yes, book it.",
  });

  assert.equal(externalCalls, 0);
  assert.match(result.answer, /name|email|identifying/i);
});

test("cancels a pending request before routing the next step", async () => {
  const sessionStore = createSessionStore();
  const session = sessionStore.load("session-cancel");
  session.pending = { type: "slot_filling", requestType: "data_lookup", missingSlot: "topic" };
  sessionStore.save(session);
  const engine = createTestConversationEngine({ sessionStore });

  const result = await engine.chat({
    requestId: "chat-cancel",
    sessionId: "session-cancel",
    message: "batal dulu",
  });

  assert.equal(result.answer, "Okay, I cancelled the pending request.");
  assert.equal(sessionStore.load("session-cancel").pending, null);
});

test("uses reference matches as the verification decision", async () => {
  const sessionStore = createSessionStore();
  const session = sessionStore.load("verification-reference-session");
  session.pending = {
    type: "verification",
    customerId: "customer-1",
    verificationFields: ["billingZip", "lastTransaction"],
    minimumMatches: 2,
  };
  sessionStore.save(session);
  const db = createTestDb();
  db.getCustomerReference = async () => ({
    id: "customer-1",
    billingZip: "98109",
    lastTransaction: "$22.99 on June 2",
  });
  const engine = createTestConversationEngine({
    sessionStore,
    db,
    llmClient: createTestLlmClient({
      structuredOverride({ fallback }) {
        return { ...(fallback || {}), pass: false };
      },
    }),
  });

  const result = await engine.chat({
    sessionId: "verification-reference-session",
    message: "98109, $22.99 on June 2.",
  });

  assert.match(result.answer, /Verification passed/i);
});

test("requires verification before protected data retrieval", async () => {
  const sessionStore = createSessionStore();
  const session = sessionStore.load("protected-retrieval-session");
  session.customerContext = { customerId: "customer-1", accountId: "NF-710" };
  sessionStore.save(session);
  const db = createTestDb();
  db.getCustomerReference = async () => ({
    id: "customer-1",
    billingZip: "98109",
    lastTransaction: "$22.99 on June 2",
  });
  const engine = createTestConversationEngine({
    sessionStore,
    db,
    profile: {
      brand: "Netflicks",
      verification: {
        required: true,
        fields: ["billingZip", "lastTransaction"],
        minimumMatches: 1,
      },
      verificationQuestion: "Please confirm your billing ZIP and latest completed charge.",
    },
  });

  const result = await engine.chat({
    sessionId: "protected-retrieval-session",
    message: "I think I was charged twice.",
  });

  assert.match(result.answer, /confirm your billing ZIP/i);
  assert.equal(sessionStore.load("protected-retrieval-session").pending?.type, "verification");
});

test("uses control decision to change intent while a request is pending", async () => {
  const sessionStore = createSessionStore();
  const session = sessionStore.load("session-intent-change");
  session.pending = { type: "slot_filling", requestType: "data_lookup", missingSlot: "topic" };
  sessionStore.save(session);
  const engine = createTestConversationEngine({
    sessionStore,
    llmClient: createTestLlmClient({
      structuredOverride({ task, fallback }) {
        if (String(task).includes("correction, an intent change")) {
          return { control: "intent_change", intent: "data_retrieval", entities: { topic: "refund" } };
        }
        return fallback || {};
      },
    }),
  });

  const result = await engine.chat({
    requestId: "chat-intent-change",
    sessionId: "session-intent-change",
    message: "sekarang cari data refund policy",
  });

  assert.match(result.answer, /Refund Policy/i);
  assert.equal(sessionStore.load("session-intent-change").pending, null);
});

test("offers profile-specific help after customer identification", async () => {
  const db = createTestDb();
  db.searchCustomers = async () => [{ id: "customer-1", accountId: "CW-1" }];
  const engine = createTestConversationEngine({
    db,
    profile: {
      brand: "Chasewood Bank",
      offers: ["review a transaction", "open a card dispute"],
    },
  });

  const result = await engine.chat({
    requestId: "chat-profile-offer",
    sessionId: "session-profile-offer",
    message: "My account ID is CW-1",
  });

  assert.match(result.answer, /Chasewood Bank/);
  assert.match(result.answer, /review a transaction/);
  assert.match(result.answer, /open a card dispute/);
});

test("continues an active action after customer identification", async () => {
  const sessionStore = createSessionStore();
  const session = sessionStore.load("session-identification-continuation");
  session.turns = [
    { userMessage: "I need a flight.", assistantAnswer: "Where would you like to go?" },
    { userMessage: "The 1:40 PM flight works.", assistantAnswer: "To book this flight, please provide your name and email." },
  ];
  sessionStore.save(session);
  const db = createTestDb();
  db.searchCustomers = async () => [{ id: "traveler-1" }];
  const engine = createTestConversationEngine({
    sessionStore,
    db,
    profile: {
      brand: "Deltaway Air",
      action: { name: "create flight booking", path: "external_api" },
      offers: ["search flights", "create a booking"],
    },
  });

  const result = await engine.chat({
    requestId: "chat-identification-continuation",
    sessionId: "session-identification-continuation",
    message: "Morgan Reed, morgan.reed@example.com.",
  });

  assert.match(result.answer, /Would you like me to proceed/i);
  assert.doesNotMatch(result.answer, /What would you like help with/i);
  assert.equal(sessionStore.load("session-identification-continuation").pending, null);
});

test("does not imply an action is ready immediately after early identification", async () => {
  const db = createTestDb();
  db.searchCustomers = async () => [{ id: "patient-1" }];
  const engine = createTestConversationEngine({
    db,
    profile: {
      brand: "MediGreen",
      offers: ["check a prescription", "request refill approval"],
      action: { name: "request refill approval", path: "external_api" },
    },
  });

  const result = await engine.chat({ sessionId: "early-identification", message: "3125550176" });

  assert.doesNotMatch(result.answer, /Would you like me to proceed/i);
  assert.match(result.answer, /check a prescription|request refill approval/i);
});

test("uses session context for short travel option follow-ups", async () => {
  const db = createTestDb();
  let queries = 0;
  db.searchCustomers = async () => [{ id: "traveler-1", bookingReference: "DW7K2P" }];
  db.queryData = async ({ topic }) => {
    queries += 1;
    assert.match(topic, /DW7K2P|options|1:40/i);
    return [
      {
        id: "booking-DW7K2P",
        title: "Deltaway booking DW7K2P",
        topic: "booking",
        summary: "Booking DW7K2P has a 1:40 PM option with a $35 fare difference.",
      },
    ];
  };
  const engine = createTestConversationEngine({
    db,
    profile: {
      brand: "Deltaway Air",
      dataSource: "internal",
      guidedResponses: true,
      identification: { mode: "booking", fields: ["bookingReference", "lastName"] },
      verification: { required: false, fields: [], minimumMatches: 0 },
      offers: ["check flight alternatives", "change an eligible booking"],
      action: { name: "change flight booking", path: "external_api" },
    },
  });

  await engine.chat({
    requestId: "travel-1",
    sessionId: "travel-session",
    message: "DW7K2P, Reed.",
  });
  const options = await engine.chat({
    requestId: "travel-2",
    sessionId: "travel-session",
    message: "What are my options?",
  });
  const time = await engine.chat({
    requestId: "travel-3",
    sessionId: "travel-session",
    message: "1:40 works.",
  });

  assert.equal(queries, 2);
  assert.doesNotMatch(options.answer, /Options for what|clarify/i);
  assert.doesNotMatch(time.answer, /What does|clarify/i);
});

test("retrieves evidence again when the customer asks for the best option", async () => {
  const db = createTestDb();
  let queries = 0;
  db.queryData = async () => {
    queries += 1;
    return [
      {
        id: "flight-1",
        topic: "flight",
        title: "Morning flight",
        summary: "The morning flight is the lowest fare and arrives before dinner.",
      },
    ];
  };
  const engine = createTestConversationEngine({
    db,
    profile: { brand: "Deltaway Air", dataSource: "internal", guidedResponses: true },
  });

  await engine.chat({ sessionId: "decision-session", message: "Show me available flights." });
  await engine.chat({ sessionId: "decision-session", message: "Which is the best option?" });

  assert.equal(queries, 2);
});

test("treats card possession as a guided transaction follow-up", async () => {
  const db = createTestDb();
  let queries = 0;
  db.queryData = async ({ topic }) => {
    queries += 1;
    assert.match(topic, /card is with me/i);
    return [
      {
        id: "card-security",
        topic: "card security",
        summary: "A card can be locked when suspicious activity is suspected.",
      },
    ];
  };
  const engine = createTestConversationEngine({
    db,
    profile: {
      brand: "Chasewood Bank",
      dataSource: "internal",
      guidedResponses: true,
    },
  });

  await engine.chat({ sessionId: "card-possession-session", message: "Hi." });
  const result = await engine.chat({
    sessionId: "card-possession-session",
    message: "The card is with me. Does that change what I should do?",
  });

  assert.equal(queries, 1);
  assert.doesNotMatch(result.answer, /What card are you referring to|clarify/i);
});

test("uses profile data for customer needs during guided discovery", async () => {
  const db = createTestDb();
  let queries = 0;
  db.queryData = async () => {
    queries += 1;
    return [{ id: "gentle-facial", topic: "skin", summary: "A gentle facial has little downtime." }];
  };
  const engine = createTestConversationEngine({
    db,
    profile: { brand: "Glowphora", dataSource: "internal", guidedResponses: true },
  });

  await engine.chat({ sessionId: "discovery-session", message: "Hi." });
  await engine.chat({ sessionId: "discovery-session", message: "My skin gets irritated easily." });

  assert.equal(queries, 1);
});

test("uses the assistant offer as context for a short scheduling follow-up", async () => {
  const db = createTestDb();
  let lookupTopic = "";
  db.queryData = async ({ topic }) => {
    lookupTopic = topic;
    return [{ id: "slot-1", topic: "consultation schedule", summary: "Friday at 4:30 PM is available." }];
  };
  const engine = createTestConversationEngine({
    db,
    profile: { brand: "Glowphora", dataSource: "internal", guidedResponses: true },
  });

  await engine.chat({ sessionId: "schedule-context", message: "Hi." });
  await engine.chat({ sessionId: "schedule-context", message: "What happens at the consultation?" });
  await engine.chat({ sessionId: "schedule-context", message: "When can I come in?" });

  assert.match(lookupTopic, /consultation|schedule/i);
});

test("retrieves schedule data for a day-part preference", async () => {
  const db = createTestDb();
  let queries = 0;
  db.queryData = async () => {
    queries += 1;
    return [{ id: "slot-1", topic: "consultation schedule", summary: "Friday at 4:30 PM is available." }];
  };
  const engine = createTestConversationEngine({
    db,
    profile: { brand: "Glowphora", dataSource: "internal", guidedResponses: true },
  });

  await engine.chat({ sessionId: "day-part-session", message: "Hi." });
  await engine.chat({ sessionId: "day-part-session", message: "Friday afternoon." });

  assert.equal(queries, 1);
});

function createTestConversationEngine({
  llmClient = createTestLlmClient(),
  sessionStore = createSessionStore(),
  db = createTestDb(),
  api = createExternalApi(),
  profile = {},
} = {}) {
  return createConversationEngine({
    llmClient,
    sessionStore,
    db,
    api,
    internalTools: createInternalTools(),
    arize: createArizeEvaluator(),
    profile,
  });
}

function createTestDb() {
  return {
    async loadRequirementSchema() {
      return ["topic"];
    },
    async searchCustomers() {
      return [];
    },
    async getCustomerReference() {
      return null;
    },
    async queryData() {
      return [
        {
          id: "doc_refund_policy",
          title: "Refund Policy",
          topic: "refund",
          excerpt: "Refund requests are reviewed against eligibility conditions.",
        },
      ];
    },
    async searchDocuments() {
      return [
        {
          id: "doc_refund_policy",
          title: "Refund Policy",
          topic: "refund",
          excerpt: "Refund requests are reviewed against eligibility conditions.",
        },
      ];
    },
    async executeDataChange({ actionName }) {
      return {
        status: "completed",
        actionName,
        result: "Internal data operation recorded.",
      };
    },
  };
}

function createTestLlmClient({ structuredOverride } = {}) {
  return {
    enabled: true,
    async generateStructured(input) {
      if (structuredOverride) return structuredOverride(input);
      const { fallback } = input;
      return fallback || {};
    },
    async generateAnswer({ userMessage }) {
      if (String(userMessage).includes("Evidence:")) return "Refund Policy: refund requests are reviewed against eligibility conditions.";
      if (String(userMessage).includes("Result:")) return "Internal method completed.";
      return `Answer for: ${userMessage}`;
    },
  };
}
