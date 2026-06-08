import assert from "node:assert/strict";
import test from "node:test";
import { createBusinessTools } from "../src/adk/business-tools.js";

test("ADK action tool requires explicit customer confirmation", async () => {
  let executions = 0;
  const tools = createTestTools({
    profile: createProfile(),
    db: {
      ...createDb(),
      async executeDataChange() {
        executions += 1;
        return { status: "completed", ticketId: "ORD-1" };
      },
    },
  });
  const action = tools.find((tool) => tool.name === "execute_business_action");

  const result = await action.runAsync({
    args: {
      actionName: "place pickup purchase",
      confirmationText: "The CrispPro sounds good.",
    },
    toolContext: createToolContext(),
  });

  assert.equal(result.status, "confirmation_required");
  assert.equal(executions, 0);
});

test("ADK protected data requires identification and verification", async () => {
  const profile = createProfile({
    identification: { mode: "required", fields: ["phone"] },
    verification: { required: true, fields: ["postalCode"], minimumMatches: 1 },
  });
  const tools = createTestTools({ profile });
  const search = tools.find((tool) => tool.name === "search_business_data");
  const context = createToolContext();

  const unidentified = await search.runAsync({
    args: { topic: "latest transaction", customerData: true },
    toolContext: context,
  });
  assert.equal(unidentified.status, "identification_required");

  context.state.set("customerIdentified", true);
  context.state.set("customerId", "customer-1");
  const unverified = await search.runAsync({
    args: { topic: "latest transaction", customerData: true },
    toolContext: context,
  });
  assert.equal(unverified.status, "verification_required");

  context.state.set("customerVerified", true);
  const allowed = await search.runAsync({
    args: { topic: "latest transaction", customerData: true },
    toolContext: context,
  });
  assert.equal(allowed.status, "success");
  assert.equal(allowed.count, 1);
});

test("ADK action allows non-protected traveler details without existing customer identification", async () => {
  const profile = createProfile({
    identification: { mode: "traveler", fields: ["name", "email"] },
    verification: { required: false, fields: [], minimumMatches: 0 },
  });
  const tools = createTestTools({ profile });
  const action = tools.find((tool) => tool.name === "execute_business_action");
  const context = createToolContext();

  const result = await action.runAsync({
    args: {
      actionName: "place pickup purchase",
      confirmationText: "Yes, book it.",
    },
    toolContext: context,
  });

  assert.equal(result.completed, true);
  assert.equal(result.result.ticketId, "ORD-1");
});

test("ADK identification and verification update session state", async () => {
  const profile = createProfile({
    identification: { mode: "required", fields: ["phone"] },
    verification: { required: true, fields: ["postalCode"], minimumMatches: 1 },
  });
  const tools = createTestTools({ profile });
  const identify = tools.find((tool) => tool.name === "identify_customer");
  const verify = tools.find((tool) => tool.name === "verify_customer");
  const context = createToolContext();

  const identification = await identify.runAsync({
    args: { identifiers: ["3125550176"] },
    toolContext: context,
  });
  assert.equal(identification.identified, true);
  assert.equal(context.state.get("customerId"), "customer-1");

  const verification = await verify.runAsync({
    args: { answers: ["60601"] },
    toolContext: context,
  });
  assert.equal(verification.verified, true);
  assert.equal(context.state.get("customerVerified"), true);
});

test("ADK action tool stores a grounded customer response", async () => {
  const tools = createTestTools();
  const action = tools.find((tool) => tool.name === "execute_business_action");
  const context = createToolContext();

  const result = await action.runAsync({
    args: {
      actionName: "place pickup purchase",
      confirmationText: "Yes, place it.",
    },
    toolContext: context,
  });

  assert.equal(result.completed, true);
  assert.equal(result.customerMessage, "The action was completed successfully. Your reference number is ORD-1.");
  assert.equal(context.state.get("actionResponsePending"), true);
  assert.equal(context.state.get("actionCustomerMessage"), result.customerMessage);
});

test("ADK external action tool stores a local reference", async () => {
  const tools = createTestTools({
    profile: createProfile({
      action: { name: "request prescriber approval", path: "external_api", integration: "approval" },
      externalIntegrations: { approval: {} },
    }),
  });
  const action = tools.find((tool) => tool.name === "execute_business_action");
  const context = createToolContext();

  const result = await action.runAsync({
    args: {
      actionName: "request prescriber approval",
      confirmationText: "Yes, request approval.",
    },
    toolContext: context,
  });

  assert.equal(result.completed, true);
  assert.equal(result.result.ticketId, "ORD-1");
  assert.equal(result.customerMessage, "The action was completed successfully. Your reference number is ORD-1.");
  assert.doesNotMatch(result.customerMessage, /mock|tool/i);
});

function createTestTools({ profile = createProfile(), db = createDb() } = {}) {
  return createBusinessTools({
    profile,
    db,
    api: {
      async queryData() {
        return { status: "success", records: [] };
      },
      async callTool() {
        return { status: "completed", result: "Mock external tool completed: request prescriber approval" };
      },
    },
    internalTools: {
      async run() {
        return { status: "completed" };
      },
    },
    arize: {
      async evaluate() {
        return { decision: "pass" };
      },
    },
  });
}

function createProfile(overrides = {}) {
  return {
    id: "test",
    brand: "Test Business",
    domain: "customer service",
    offers: ["help customers"],
    identification: { mode: "none", fields: [] },
    verification: { required: false, fields: [], minimumMatches: 0 },
    action: { name: "place pickup purchase", path: "internal_data" },
    externalIntegrations: {},
    ...overrides,
  };
}

function createDb() {
  return {
    async queryData() {
      return [{ id: "record-1", topic: "latest transaction" }];
    },
    async searchDocuments() {
      return [];
    },
    async searchCustomers() {
      return [{ id: "customer-1", phone: "3125550176", postalCode: "60601" }];
    },
    async getCustomerReference() {
      return { id: "customer-1", phone: "3125550176", postalCode: "60601" };
    },
    async executeDataChange() {
      return { status: "completed", ticketId: "ORD-1" };
    },
  };
}

function createToolContext() {
  const values = new Map();
  return {
    state: {
      get(key, fallback) {
        return values.has(key) ? values.get(key) : fallback;
      },
      set(key, value) {
        values.set(key, value);
      },
    },
  };
}
