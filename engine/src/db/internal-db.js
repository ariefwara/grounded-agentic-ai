import { Firestore } from "@google-cloud/firestore";

export function createInternalDb({ config = {}, env = process.env } = {}) {
  validateConfig(config);
  const firestore = new Firestore({
    projectId: env[config.connection.projectIdEnv],
    databaseId: env[config.connection.databaseIdEnv],
  });
  const namespaceId = env[config.namespace.documentIdEnv];
  if (!namespaceId) throw new Error(`Missing internal data namespace environment variable: ${config.namespace.documentIdEnv}`);
  const root = firestore.collection(config.namespace.collection).doc(namespaceId);
  const collections = config.collections;
  const cacheEnabled = env.INTERNAL_DB_CACHE !== "off";
  const preloadEnabled = env.INTERNAL_DB_PRELOAD !== "off";
  const cacheTtlMs = Number(env.INTERNAL_DB_CACHE_TTL_MS || 5 * 60 * 1000);
  const collectionCache = new Map();

  if (preloadEnabled) {
    warmCollections(config.preload).catch((error) => {
      console.warn(`internal db preload failed: ${error instanceof Error ? error.message : "unknown error"}`);
    });
  }

  return {
    async loadRequirementSchema(requestType) {
      const schemas = await readConfiguredCollection("requirements");
      const schema = schemas.find((item) => item.id === requestType);
      return normalizeArray(schema?.requiredSlots, ["topic"]);
    },

    async searchCustomers(identifiers = {}) {
      const values = Object.values(identifiers).filter(Boolean).map((value) => normalizeText(value));
      if (values.length === 0) return [];
      const fields = config.customerSearchFields;
      const customers = await readConfiguredCollection("customers");
      return customers.filter((customer) =>
        values.some((value) => fields.some((field) => normalizeText(customer[field]).includes(value))),
      );
    },

    async getCustomerReference(customerId) {
      if (!customerId) return null;
      const customers = await readConfiguredCollection("customers");
      return customers.find((customer) => customer.id === customerId) || null;
    },

    async loadPolicy(topic = "refund") {
      const policies = await readConfiguredCollection("policies");
      const policy = policies.find((item) => item.id === topic || item.topic === topic);
      return policy?.text || policies.find((item) => item.id === "default")?.text || "";
    },

    async queryData({ topic }) {
      if (!normalizeText(topic)) return [];
      const sources = config.queryCollections;
      const groups = await Promise.all(sources.map((name) => readConfiguredCollection(name)));
      const items = groups.flat();
      const identifiers = extractIdentifiers(topic);
      if (identifiers.length > 0) {
        const identifierMatches = items.filter((item) =>
          identifiers.some((identifier) => searchableText(item, config.searchFields).includes(normalizeText(identifier))),
        );
        if (identifierMatches.length > 0) return identifierMatches;
      }
      const queryTokens = meaningfulTokens(topic);
      return items.filter((item) =>
        queryTokens.some((token) => searchableText(item, config.searchFields).includes(token)),
      );
    },

    async searchDocuments({ topic }) {
      if (!normalizeText(topic)) return [];
      const documents = await readConfiguredCollection("documents");
      const queryTokens = meaningfulTokens(topic);
      return documents.filter((document) =>
        queryTokens.some((token) => searchableText(document, config.searchFields).includes(token)),
      );
    },

    async executeDataChange({ actionName }) {
      const counterDocument = config.actionStorage.counterDocument;
      const counterRef = root.collection(collections.state).doc(counterDocument);
      const result = await firestore.runTransaction(async (transaction) => {
        const counterSnapshot = await transaction.get(counterRef);
        const counter = counterSnapshot.data() || { prefix: "TKT", nextNumber: 1 };
        const ticketId = `${counter.prefix}-${counter.nextNumber}`;
        const ref = root.collection(collections.actions).doc(ticketId);
        const record = {
          status: "completed",
          ticketId,
          actionName,
          result: `${ticketId} was created successfully.`,
          createdAt: new Date().toISOString(),
        };
        transaction.set(ref, record);
        transaction.set(counterRef, { prefix: counter.prefix, nextNumber: Number(counter.nextNumber) + 1 }, { merge: true });
        return record;
      });
      collectionCache.delete(collections.actions);
      return result;
    },
  };

  async function warmCollections(names) {
    await Promise.all(names.map((name) => readConfiguredCollection(name)));
  }

  async function readConfiguredCollection(name) {
    const collectionName = collections[name];
    if (!collectionName) throw new Error(`Internal data collection "${name}" is not configured.`);
    if (!cacheEnabled) return await readCollection(root.collection(collectionName));
    const existing = collectionCache.get(collectionName);
    if (existing && Date.now() < existing.expiresAt) return await existing.promise;
    const promise = readCollection(root.collection(collectionName));
    collectionCache.set(collectionName, { promise, expiresAt: Date.now() + cacheTtlMs });
    return await promise;
  }
}

async function readCollection(collection) {
  const snapshot = await collection.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function normalizeArray(value, fallback) {
  return Array.isArray(value) && value.length > 0 ? value : fallback;
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
}

function searchableText(item, fields = ["id", "topic", "title", "excerpt", "text", "summary"]) {
  return normalizeText(fields.map((field) => item[field]).filter(Boolean).join(" "));
}

function extractIdentifiers(value) {
  return String(value || "").match(/\b[a-z]{1,8}(?:-[a-z]{1,8})?-\d+\b/gi) || [];
}

function meaningfulTokens(value) {
  const stopwords = new Set(["cari", "data", "lihat", "dokumen", "document", "policy", "untuk", "saya", "yang", "tidak", "ada", "nomor", "status", "internal"]);
  const tokens = normalizeText(value).split(/\s+/).filter((token) => token.length > 2 && !stopwords.has(token));
  return [...new Set(tokens.flatMap((token) => [token, singularSearchToken(token)]).filter(Boolean))];
}

function singularSearchToken(token) {
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return null;
}

function validateConfig(config) {
  const requiredCollections = ["customers", "policies", "documents", "records", "requirements", "state", "actions"];
  if (config.adapter !== "firestore") throw new Error(`Unsupported internal data adapter: ${config.adapter || "missing"}`);
  if (!config.connection?.projectIdEnv || !config.connection?.databaseIdEnv) {
    throw new Error("Internal data connection environment mapping is incomplete.");
  }
  if (!config.namespace?.collection || !config.namespace?.documentIdEnv) {
    throw new Error("Internal data namespace configuration is incomplete.");
  }
  for (const name of requiredCollections) {
    if (!config.collections?.[name]) throw new Error(`Internal data collection mapping "${name}" is missing.`);
  }
  if (!Array.isArray(config.preload) || !Array.isArray(config.queryCollections)) {
    throw new Error("Internal data preload and query collection configuration is required.");
  }
  if (!Array.isArray(config.searchFields) || !Array.isArray(config.customerSearchFields)) {
    throw new Error("Internal data search field configuration is required.");
  }
  if (!config.actionStorage?.counterDocument) {
    throw new Error("Internal action storage configuration is incomplete.");
  }
}
