import { createHash, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { renderPrompt } from "../prompts/prompt-loader.js";

const DEFAULT_SESSION_ID = "web-chat-default";
const TIMING_LOG_ENABLED = process.env.ENGINE_TIMING_LOG === "on";
const CACHE_ENABLED = process.env.ENGINE_RESPONSE_CACHE !== "off";
const CACHE_TTL_MS = Number(process.env.ENGINE_RESPONSE_CACHE_TTL_MS || 5 * 60 * 1000);
const CACHE_MAX_ENTRIES = Number(process.env.ENGINE_RESPONSE_CACHE_MAX_ENTRIES || 200);
const relevantAnswerCache = new Map();
const evidenceAnswerCache = new Map();

export function createConversationEngine({ llmClient, sessionStore, db, api, internalTools, arize, profile = {} }) {
  return {
    async chat(input) {
      const requestId = input.requestId || randomUUID();
      const sessionId = input.sessionId || input.user?.sessionId || DEFAULT_SESSION_ID;
      const message = String(input.message || "").trim();
      const channel = input.channel || "web-chat";
      if (!message) {
        return {
          requestId,
          sessionId,
          answer: "Please send a message first.",
        };
      }

      let session = sessionStore.load(sessionId);
      const timing = { requestId, sessionId };
      let interpretation = await routeMessage({ llmClient, message, session, channel, profile, timing });
      if (interpretation.intent === "cancel") {
        session.pending = null;
        session.collectedSlots = {};
        sessionStore.save(addTurn(session, message, "Cancelled the pending request."));
        return { requestId, sessionId, answer: "Okay, I cancelled the pending request." };
      }

      if (session.pending && !isDirectPendingAnswer(session, interpretation)) {
        interpretation = await timedStep(timing, "conversation.control_message", () =>
          inspectControlMessage({ llmClient, message, session, interpretation }),
        );
        if (interpretation.control === "intent_change") {
          session.pending = null;
        }
      }
      const classification = await timedStep(timing, "arize.classification", () =>
        arize.evaluate({
          type: "classification",
          candidate: interpretation,
          decision: interpretation.intent === "unclear" ? "review" : "usable",
        }),
      );

      if (classification.decision === "review") {
        return await timedStep(timing, "handler.clarification", () =>
          askClarification({
            requestId,
            session,
            sessionStore,
            llmClient,
            arize,
            message,
            reason: "The request is unclear.",
            timing,
          }),
        );
      }

      if (session.pending?.type === "clarification") {
        session = await timedStep(timing, "conversation.merge_clarification", () =>
          mergeClarification({ llmClient, session, message, timing }),
        );
      }

      if (session.pending?.type === "slot_filling") {
        return await timedStep(timing, "handler.slot_filling", () =>
          handleSlotFilling({
            requestId,
            session,
            sessionStore,
            db,
            llmClient,
            arize,
            message,
            interpretation,
            profile,
            timing,
          }),
        );
      }

      if (session.pending?.type === "customer_context") {
        return await timedStep(timing, "handler.customer_context", () =>
          handleCustomerContext({ requestId, session, sessionStore, db, llmClient, arize, message, profile, timing }),
        );
      }

      if (session.pending?.type === "verification") {
        return await timedStep(timing, "handler.verification_answer", () =>
          handleVerificationAnswer({
            requestId,
            session,
            sessionStore,
            db,
            llmClient,
            arize,
            message,
            profile,
            timing,
          }),
        );
      }

      if (interpretation.intent === "small_talk") {
        return await timedStep(timing, "handler.welcome", () =>
          handleWelcome({ requestId, session, sessionStore, message, profile }),
        );
      }

      if (requiresIdentificationBeforeData({ interpretation, session, profile, message })) {
        return await timedStep(timing, "handler.customer_context", () =>
          handleCustomerContext({ requestId, session, sessionStore, db, llmClient, arize, message, profile, timing }),
        );
      }

      if (requiresVerificationBeforeProtectedOperation({ interpretation, session, profile, message })) {
        return await timedStep(timing, "handler.start_verification", () =>
          startVerification({ requestId, session, sessionStore, db, llmClient, arize, message, profile, timing }),
        );
      }

      if (interpretation.intent === "relevant_answer") {
        return await timedStep(timing, "handler.relevant_answer", () =>
          handleRelevantAnswer({ requestId, session, sessionStore, llmClient, arize, message, profile, timing }),
        );
      }

      if (interpretation.intent === "customer_context") {
        return await timedStep(timing, "handler.customer_context", () =>
          handleCustomerContext({ requestId, session, sessionStore, db, llmClient, arize, message, profile, timing }),
        );
      }

      if (interpretation.intent === "verification") {
        return await timedStep(timing, "handler.start_verification", () =>
          startVerification({ requestId, session, sessionStore, db, llmClient, arize, message, profile, timing }),
        );
      }

      if (interpretation.intent === "data_retrieval") {
        return await timedStep(timing, "handler.data_retrieval", () =>
          handleDataRetrieval({
            requestId,
            session,
            sessionStore,
            db,
            api,
            llmClient,
            arize,
            message,
            interpretation,
            profile,
            timing,
          }),
        );
      }

      if (interpretation.intent === "document_retrieval") {
        return await timedStep(timing, "handler.document_retrieval", () =>
          handleDocumentRetrieval({ requestId, session, sessionStore, db, llmClient, arize, message, profile, timing }),
        );
      }

      if (interpretation.intent === "action") {
        return await timedStep(timing, "handler.action", () =>
          handleAction({
            requestId,
            session,
            sessionStore,
            db,
            api,
            internalTools,
            llmClient,
            arize,
            message,
            profile,
            timing,
          }),
        );
      }

      if (interpretation.intent === "unsupported") {
        return await timedStep(timing, "handler.unsupported", () =>
          handleFailure({ requestId, session, sessionStore, llmClient, arize, message, kind: "unsupported", timing }),
        );
      }

      return await timedStep(timing, "handler.clarification", () =>
        askClarification({
          requestId,
          session,
          sessionStore,
          llmClient,
          arize,
          message,
          reason: "The next step is unclear.",
          timing,
        }),
      );
    },
  };
}

async function routeMessage({ llmClient, message, session, channel, profile, timing }) {
  const deterministic = classifyDeterministically(message, session, profile);
  if (canUseFastRoute(deterministic, message, session)) {
    return await timedStep(timing, "conversation.fast_route", async () => deterministic);
  }

  return await timedStep(timing, "conversation.understand_message", () =>
    understandMessage({ llmClient, message, session, channel, profile, fallback: deterministic, timing }),
  );
}

async function inspectControlMessage({ llmClient, message, session, interpretation }) {
  const control = await llmClient.generateStructured({
    task: renderPrompt("correction-intent-change-cancel/classify-control-message"),
    context: {
      message,
      pending: session.pending,
      collectedSlots: session.collectedSlots,
      interpretation,
    },
    fallback: {
      control: interpretation.intent === "cancel" ? "cancel" : "continue",
      intent: interpretation.intent,
      entities: interpretation.entities || {},
    },
  });

  if (control.control === "cancel") {
    return { ...interpretation, control: "cancel", intent: "cancel", role: "control" };
  }

  if (control.control === "intent_change") {
    return {
      ...interpretation,
      control: "intent_change",
      intent: control.intent || control.newIntent || interpretation.intent,
      role: "new_request",
      entities: {
        ...(interpretation.entities || {}),
        ...(control.entities || {}),
      },
    };
  }

  if (control.control === "correction") {
    return {
      ...interpretation,
      control: "correction",
      role: "answer_to_pending",
      entities: {
        ...(interpretation.entities || {}),
        ...(control.entities || {}),
      },
    };
  }

  return {
    ...interpretation,
    control: control.control || "continue",
    intent: control.intent || interpretation.intent,
    entities: {
      ...(interpretation.entities || {}),
      ...(control.entities || {}),
    },
  };
}

async function understandMessage({ llmClient, message, session, channel, profile, fallback, timing }) {
  const result = await timedStep(timing, "llm.conversation_routing.understand_and_classify", () =>
    llmClient.generateStructured({
      task: renderPrompt("conversation-routing/understand-and-classify"),
      context: {
        message,
        channel,
        profile,
        session,
      },
      fallback,
    }),
  );

  if (result.intent === "action" && profile.action && !isConfiguredActionConfirmation(message, profile)) {
    return {
      intent: "data_retrieval",
      role: result.role || "new_request",
      entities: result.entities || fallback.entities,
    };
  }

  return {
    intent: result.intent || fallback.intent,
    role: result.role || fallback.role,
    entities: result.entities || fallback.entities,
  };
}

function canUseFastRoute(interpretation, message, session) {
  if (interpretation.intent === "cancel") return true;
  if (isDirectPendingAnswer(session, interpretation)) return true;
  if (session.pending) return false;
  if (["data_retrieval", "document_retrieval", "action", "customer_context", "verification"].includes(interpretation.intent)) return true;
  if (interpretation.intent === "small_talk") return true;
  return interpretation.intent === "relevant_answer" && isRelevantDirectAnswer(message);
}

function isDirectPendingAnswer(session, interpretation) {
  return session.pending?.type === "verification" && interpretation.intent === "verification" && interpretation.role === "answer_to_pending";
}

function classifyDeterministically(message, session, profile = {}) {
  const text = message.toLowerCase();
  if (isCancelCommand(text)) {
    return { intent: "cancel", role: "control", entities: {} };
  }
  if (session.pending?.type === "verification") {
    return { intent: "verification", role: "answer_to_pending", entities: { answer: message } };
  }
  if (session.pending?.type === "slot_filling" || session.pending?.type === "clarification") {
    return { intent: "clarification", role: "answer_to_pending", entities: { answer: message } };
  }
  if (/^(halo|hai|hi|hello|good morning|good afternoon|good evening)\b/i.test(text)) {
    return { intent: "small_talk", role: "new_request", entities: {} };
  }
  if (isConfiguredActionConfirmation(text, profile)) {
    return { intent: "action", role: "new_request", entities: { actionName: profile.action?.name } };
  }
  if (isContextualDataFollowUp(text, session)) {
    return { intent: "data_retrieval", role: "new_request", entities: { topic: message } };
  }
  if (shouldStartProfileVerification({ text, profile, session }) && !isDefinitionOrComparisonQuestion(text)) {
    return { intent: "verification", role: "new_request", entities: { topic: extractTopic(message) } };
  }
  if (isGuidedDiscoveryTurn(text, session, profile)) {
    return { intent: "data_retrieval", role: "new_request", entities: { topic: message } };
  }
  if (isRelevantDirectAnswer(message)) {
    return { intent: "relevant_answer", role: "new_request", entities: { topic: extractTopic(message) } };
  }
  if (/(dokumen|document|file|berkas|guide|instructions)/i.test(text)) {
    return { intent: "document_retrieval", role: "new_request", entities: { topic: extractTopic(message) } };
  }
  if (
    /\b(buat|create|update|ubah|hapus|delete|kirim|send|trigger|open|reserve|schedule|book|place|change|dispute)\b/i.test(text)
    && !isDecisionExplorationQuestion(text)
  ) {
    return { intent: "action", role: "new_request", entities: { actionName: extractTopic(message) } };
  }
  if (
    /(sensitif|saldo|rekening|protected|verify|verifikasi)/i.test(text)
  ) {
    return { intent: "verification", role: "new_request", entities: { topic: extractTopic(message) } };
  }
  if (
    /(akun|account|customer|pelanggan|alamat|address|transaksi terakhir|latest transaction|email|phone|phone number|mobile number|confirmation code|booking reference|policy number|my name is|last name is|contact)/i.test(
      text,
    ) ||
    Object.keys(extractIdentifiersByRule(message)).length > 0
  ) {
    return { intent: "customer_context", role: "new_request", entities: { identifier: extractIdentifier(message) } };
  }
  if (/\b(data|cari|lookup|policy|refund|return|status|inventory|availability|available|stock|price|invoice|tracking|prescription|transaction|claim|schedule|slot|option|options|alternative|alternatives)\b|look up/i.test(text)) {
    return { intent: "data_retrieval", role: "new_request", entities: { topic: message } };
  }
  if (text.length < 4) return { intent: "unclear", role: "new_request", entities: {} };
  return { intent: "unsupported", role: "new_request", entities: { topic: extractTopic(message) } };
}

function isGuidedDiscoveryTurn(text, session, profile = {}) {
  if (!profile.guidedResponses || session.turns.length === 0) return false;
  return /\b(i need|i want|i have|i care|i prefer|i am looking|i'm looking|not sure|do not know|don't know|my [a-z]+|gets irritated|sounds better|works for me|(?:the )?card is with me)\b/i.test(text);
}

function isDecisionExplorationQuestion(text) {
  return /\b(should i|is it better|what do you recommend|which option|compare|difference|trade-?off|wait or|or open|or schedule|or dispute)\b/i.test(text);
}

function requiresIdentificationBeforeData({ interpretation, session, profile = {}, message }) {
  return profile.identification?.requiredBeforeData === true
    && !session.customerContext
    && (
      ["data_retrieval", "document_retrieval"].includes(interpretation.intent)
      || (interpretation.intent === "relevant_answer" && isCustomerSpecificRequest(message))
    );
}

function requiresVerificationBeforeProtectedOperation({ interpretation, session, profile = {}, message }) {
  if (!profile.verification?.required || !session.customerContext || session.verification?.status === "passed") {
    return false;
  }

  return (
    ["data_retrieval", "document_retrieval", "action"].includes(interpretation.intent)
    || (interpretation.intent === "relevant_answer" && isCustomerSpecificRequest(message))
  );
}

function isCustomerSpecificRequest(message) {
  return /\b(my|mine|latest|recent|account|invoice|bill|charged?|charges?|transaction|prescription|medicine|claim|policy|card)\b/i.test(
    String(message),
  );
}

function isContextualDataFollowUp(text, session) {
  if (!session.customerContext && session.turns.length === 0) return false;
  if (/\b(options?|alternatives?|availability|available|status|pending|delay|times?|slots?|schedule|best|better|recommend|choose|difference|trade-?offs?|compare)\b/i.test(text)) return true;
  if (/\bwhen can i (?:come|visit|pick up|arrive)\b/i.test(text)) return true;
  if (/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b.*\b(?:morning|afternoon|evening|night)\b/i.test(text)) return true;
  if (/\b\d{1,2}:\d{2}\b/.test(text) && /\b(works|ok|okay|fine|good)\b/i.test(text)) return true;
  if (/^(why|what|which|when|where|how)\b/i.test(text) && session.customerContext) return true;
  return false;
}

function isConfiguredActionConfirmation(text, profile = {}) {
  if (!profile.action) return false;
  if (isDecisionExplorationQuestion(text)) return false;
  return /\b(yes|yeah|yep|confirm|go ahead|do it|book it|place it|change it|open (?:it|one|a case|a trace)|schedule it|request it|dispute it)\b/i.test(text);
}

function isCancelCommand(text) {
  return /^(cancel|batal|reset|stop|hentikan)(\s|$)/i.test(String(text).trim());
}

function isRelevantDirectAnswer(message) {
  const text = String(message).toLowerCase();
  if (/\b(data|cari|lookup|policy|refund|return|status|dokumen|document|file|berkas|guide|akun|account|customer|pelanggan|sensitif|saldo|rekening|buat|create|update|ubah|hapus|delete|kirim|send|trigger|open|reserve|schedule)\b|look up/i.test(text)) {
    return isDefinitionOrComparisonQuestion(text);
  }
  return /\b(refund|return|claim|invoice|billing|booking|reservation|appointment|enrollment|shipping|tracking|maintenance|permit|verification|identity|customer|account|service|warranty|complaint|product|inventory|catering|coffee|home|listing|tour|skincare|consultation|flight|subscription|prescription|pharmacy|insurance|bank|transaction|dispute|delivery)\b/i.test(text);
}

function isDefinitionOrComparisonQuestion(text) {
  return /\b(apa itu|apa arti|arti dari|apa bedanya|bedanya apa|perbedaan|maksudnya|definisi|jelaskan|bagaimana proses|proses umum|apa maksud|what is|what are|what happens|how does|how do|explain|difference between)\b/i.test(text);
}

function shouldStartProfileVerification({ text, profile, session }) {
  if (!profile.verification?.required || !session.customerContext || session.verification?.status === "passed") return false;
  return /\b(account|billing|invoice|charged?|charges?|transaction|prescription|refill|coverage|claim|policy|dispute|card)\b/i.test(text);
}

async function handleWelcome({ requestId, session, sessionStore, message, profile }) {
  const brand = profile.brand || "AI Assistant";
  const offers = Array.isArray(profile.offers) ? profile.offers.filter(Boolean) : [];
  const answer = offers.length > 0
    ? `Hi, I'm the ${brand} assistant. I can ${formatOfferList(offers)}. What would you like help with today?`
    : `Hi, I'm the ${brand} assistant. What would you like help with today?`;
  session.pending = null;
  sessionStore.save(addTurn(session, message, answer));
  return { requestId, sessionId: session.id, answer };
}

async function handleRelevantAnswer({ requestId, session, sessionStore, llmClient, arize, message, profile, timing }) {
  const cacheKey = cacheKeyForMessage(message, profile, session.turns.slice(-4));
  const cached = getCache(relevantAnswerCache, cacheKey);
  if (cached) {
    const answer = await timedStep(timing, "cache.relevant_answer.hit", async () => cached);
    session.pending = null;
    sessionStore.save(addTurn(session, message, answer));
    return { requestId, sessionId: session.id, answer };
  }

  let answer = await timedStep(timing, "llm.relevant_answer.generate", () =>
    llmClient.generateAnswer({
      userMessage: renderPrompt("relevant-answer/generate-answer", {
        message,
        profileBrand: profile.brand || profile.assistantName || "the active business",
        profileDomain: profile.domain || "customer service",
        profileUseCase: profile.useCase || "general customer support",
        profileOffers: formatOfferList(profile.offers || []),
        conversationHistory: JSON.stringify(session.turns.slice(-4)),
      }),
    }),
  );
  const evaluation = await timedStep(timing, "arize.answer", () => arize.evaluate({ type: "answer", candidate: answer }));

  if (evaluation.decision === "retry") {
    answer = await timedStep(timing, "llm.relevant_answer.retry", () =>
      llmClient.generateAnswer({
        userMessage: renderPrompt("relevant-answer/retry-answer", {
          message,
          profileBrand: profile.brand || profile.assistantName || "the active business",
          profileDomain: profile.domain || "customer service",
          profileUseCase: profile.useCase || "general customer support",
          profileOffers: formatOfferList(profile.offers || []),
          conversationHistory: JSON.stringify(session.turns.slice(-4)),
        }),
      }),
    );
  }

  session.pending = null;
  setCache(relevantAnswerCache, cacheKey, answer);
  sessionStore.save(addTurn(session, message, answer));
  return { requestId, sessionId: session.id, answer };
}

async function askClarification({ requestId, session, sessionStore, llmClient, arize, message, reason, timing }) {
  let question = await timedStep(timing, "llm.clarification.ask", () =>
    llmClient.generateAnswer({
      userMessage: renderPrompt("clarification-flow/ask-clarification", { reason, message }),
    }),
  );
  const evaluation = await timedStep(timing, "arize.clarification", () =>
    arize.evaluate({ type: "clarification", candidate: question }),
  );

  if (evaluation.decision === "retry") {
    question = "Can you clarify what you need?";
  }

  session.pending = {
    type: "clarification",
    originalMessage: message,
    reason,
  };
  sessionStore.save(addTurn(session, message, question));
  return { requestId, sessionId: session.id, answer: question };
}

async function mergeClarification({ llmClient, session, message, timing }) {
  const merged = await timedStep(timing, "llm.clarification.merge", () =>
    llmClient.generateStructured({
      task: renderPrompt("clarification-flow/merge-clarification"),
      context: { pending: session.pending, clarification: message },
      fallback: { mergedMessage: `${session.pending.originalMessage} ${message}` },
    }),
  );
  session.pending = null;
  session.collectedSlots.topic = merged.mergedMessage || message;
  return session;
}

async function handleSlotFilling({ requestId, session, sessionStore, db, llmClient, arize, message, interpretation, timing }) {
  const dataNeed = await timedStep(timing, "llm.slot_filling.identify_required_information", () =>
    llmClient.generateStructured({
      task: renderPrompt("slot-filling/identify-required-information"),
      context: { message, interpretation },
      fallback: { requestType: "data_lookup" },
    }),
  );
  const requestType = dataNeed.requestType || "data_lookup";
  const requiredSlots = await timedStep(timing, "db.slot_filling.load_requirement_schema", () => db.loadRequirementSchema(requestType));
  const extracted = await timedStep(timing, "llm.slot_filling.extract_slots", () =>
    llmClient.generateStructured({
      task: renderPrompt("slot-filling/extract-slots"),
      context: { message, requiredSlots, existingSlots: session.collectedSlots },
      fallback: { slots: interpretation.entities || {} },
    }),
  );

  session.collectedSlots = {
    ...session.collectedSlots,
    ...(extracted.slots || {}),
  };

  const missing = requiredSlots.filter((slot) => !session.collectedSlots[slot]);
  if (missing.length > 0) {
    let question = await timedStep(timing, "llm.slot_filling.ask_missing_slot", () =>
      llmClient.generateAnswer({
        userMessage: renderPrompt("slot-filling/ask-missing-slot", { missingSlot: missing[0] }),
      }),
    );
    const evaluation = await timedStep(timing, "arize.slot_question", () =>
      arize.evaluate({ type: "slot_question", candidate: question }),
    );
    if (evaluation.decision === "retry") question = `What is the ${missing[0]}?`;

    session.pending = { type: "slot_filling", requestType, missingSlot: missing[0] };
    sessionStore.save(addTurn(session, message, question));
    return { requestId, sessionId: session.id, answer: question };
  }

  session.pending = null;
  sessionStore.save(session);
  return { requestId, sessionId: session.id, answer: "I have enough information to continue." };
}

async function handleCustomerContext({ requestId, session, sessionStore, db, llmClient, arize, message, profile, timing }) {
  const identifiers = await extractCustomerIdentifiers({ llmClient, message, timing });

  const candidates = await timedStep(timing, "db.customer_context.search_customers", () =>
    db.searchCustomers(identifiers.identifiers || {}),
  );
  if (candidates.length === 1) {
    const evaluation = await timedStep(timing, "arize.customer_match", () =>
      arize.evaluate({ type: "customer_match", decision: "usable", candidate: candidates[0] }),
    );
    if (evaluation.decision === "usable") {
      session.customerContext = { customerId: candidates[0].id, accountId: candidates[0].accountId };
      session.pending = null;
      const answer = customerContextSuccessMessage(profile, session);
      sessionStore.save(addTurn(session, message, answer));
      return { requestId, sessionId: session.id, answer };
    }
  }

  let question =
    profile.identificationQuestion ||
    (await timedStep(timing, "llm.customer_context.ask_identifying_detail", () =>
      llmClient.generateAnswer({
        userMessage: renderPrompt("customer-context-resolution/ask-identifying-detail", {
          message,
          brand: profile.brand || profile.assistantName || "the business",
          identificationFields: profile.identification?.fields || ["email", "phone number"],
        }),
      }),
    ));
  const evaluation = await timedStep(timing, "arize.context_question", () =>
    arize.evaluate({ type: "context_question", candidate: question }),
  );
  if (evaluation.decision === "retry") question = "Which email or account number should I use?";
  session.pending = { type: "customer_context", originalMessage: message };
  sessionStore.save(addTurn(session, message, question));
  return { requestId, sessionId: session.id, answer: question };
}

async function startVerification({ requestId, session, sessionStore, db, llmClient, arize, message, profile, timing }) {
  const customer = session.customerContext
    ? await timedStep(timing, "db.verification.get_customer_reference", () => db.getCustomerReference(session.customerContext.customerId))
    : null;
  if (!customer) {
    return await handleCustomerContext({ requestId, session, sessionStore, db, llmClient, arize, message, profile, timing });
  }

  let question =
    profile.verificationQuestion ||
    (await timedStep(timing, "llm.verification.ask_question", () =>
      llmClient.generateAnswer({
        userMessage: renderPrompt("eligibility-verification/ask-verification-question", {
          message,
          verificationFields: profile.verification?.fields || ["registered address", "recent transaction"],
        }),
      }),
    ));
  const evaluation = await timedStep(timing, "arize.verification_question", () =>
    arize.evaluate({ type: "verification_question", candidate: question }),
  );
  if (evaluation.decision === "retry") question = "What is your registered address?";

  session.pending = {
    type: "verification",
    originalMessage: message,
    customerId: customer.id,
    verificationFields: profile.verification?.fields || ["address", "lastTransaction"],
    minimumMatches: profile.verification?.minimumMatches || 1,
  };
  sessionStore.save(addTurn(session, message, question));
  return { requestId, sessionId: session.id, answer: question };
}

async function handleVerificationAnswer({ requestId, session, sessionStore, db, llmClient, arize, message, profile, timing }) {
  const customer = await timedStep(timing, "db.verification.get_customer_reference", () =>
    db.getCustomerReference(session.pending.customerId),
  );
  await timedStep(timing, "llm.verification.identify_reference_need", () =>
    llmClient.generateStructured({
      task: renderPrompt("eligibility-verification/identify-reference-need"),
      context: {
        pending: session.pending,
        userAnswer: message,
      },
      fallback: { referenceNeed: session.pending.verificationFields || profile.verification?.fields || ["address", "lastTransaction"] },
    }),
  );
  const verificationFields = session.pending.verificationFields || profile.verification?.fields || ["address", "lastTransaction"];
  const reference = Object.fromEntries(verificationFields.map((field) => [field, customer?.[field]]).filter(([, value]) => value));
  const minimumMatches = session.pending.minimumMatches || profile.verification?.minimumMatches || 1;
  const match = await timedStep(timing, "llm.verification.compare_answer", () =>
    llmClient.generateStructured({
      task: renderPrompt("eligibility-verification/compare-answer"),
      context: {
        userAnswer: message,
        reference,
        minimumMatches,
      },
      fallback: {
        pass: countReferenceMatches(message, reference) >= minimumMatches,
      },
    }),
  );
  const verifiedMatch = {
    ...match,
    pass: countReferenceMatches(message, reference) >= minimumMatches,
  };

  const evaluation = await timedStep(timing, "arize.verification", () =>
    arize.evaluate({
      type: "verification",
      decision: verifiedMatch.pass ? "pass" : "fail",
      candidate: verifiedMatch,
    }),
  );

  if (evaluation.decision === "pass") {
    session.verification = { status: "passed", at: new Date().toISOString() };
    session.pending = null;
    sessionStore.save(addTurn(session, message, "Verification passed. I can continue with your request."));
    return { requestId, sessionId: session.id, answer: "Verification passed. I can continue with your request." };
  }

  session.verification = { status: "failed", at: new Date().toISOString() };
  session.pending = null;
  sessionStore.save(addTurn(session, message, "I cannot verify that information."));
  return { requestId, sessionId: session.id, answer: "I cannot verify that information." };
}

async function handleDataRetrieval({
  requestId,
  session,
  sessionStore,
  db,
  api,
  llmClient,
  arize,
  message,
  interpretation,
  profile = {},
  timing,
}) {
  const lookupMessage = contextualLookupMessage(message, session);
  const lookupInterpretation =
    lookupMessage === message
      ? interpretation
      : {
          ...interpretation,
          entities: {
            ...(interpretation.entities || {}),
            topic: lookupMessage,
          },
        };
  const source = await selectDataSource({
    llmClient,
    message: lookupMessage,
    interpretation: lookupInterpretation,
    profile,
    timing,
  });

  const topic = source.topic || extractTopic(message);
  let evidence = [];
  if (source.source === "external") {
    const external = await timedStep(timing, "api.data_retrieval.query", () => api.queryData({ topic }));
    evidence = external.records || [];
  } else {
    evidence = await timedStep(timing, "db.data_retrieval.query", () => db.queryData({ topic }));
  }

  if (evidence.length === 0) {
    return await handleFailure({ requestId, session, sessionStore, llmClient, arize, message, kind: "not_found", timing });
  }

  let answer = getEvidenceAnswerFromCache({ kind: "data", message, evidence });
  if (answer) {
    await timedStep(timing, "cache.data_retrieval.answer_hit", async () => answer);
  } else {
    answer = composeContextualEvidenceAnswer({ message, evidence, profile })
      || (profile.guidedResponses
      ? null
      : await timedStep(timing, "data_retrieval.direct_answer", async () => composeDirectEvidenceAnswer({ message, evidence })));
  }

  if (!answer) {
    answer = await timedStep(timing, "llm.data_retrieval.answer_from_evidence", () =>
      llmClient.generateAnswer({
        userMessage: renderPrompt("data-retrieval/answer-from-evidence", {
          message,
          evidence,
          profileBrand: profile.brand || profile.assistantName || "the active business",
          profileOffers: formatOfferList(profile.offers || []),
          supportedAction: profile.action?.name || "none",
          decisionGuidance: profile.decisionGuidance || "Help the customer compare reasonable options before taking action.",
          conversationHistory: JSON.stringify(session.turns.slice(-4)),
        }),
      }),
    );
  }

  const evaluation = await timedStep(timing, "arize.groundedness", () =>
    arize.evaluate({ type: "groundedness", candidate: answer, evidence }),
  );
  if (evaluation.decision === "retry") {
    answer = await timedStep(timing, "llm.data_retrieval.retry_grounded_answer", () =>
      llmClient.generateAnswer({
        userMessage: renderPrompt("data-retrieval/retry-grounded-answer", { message, evidence }),
      }),
    );
  }

  session.pending = null;
  setEvidenceAnswerCache({ kind: "data", message, evidence, answer });
  sessionStore.save(addTurn(session, message, answer));
  return { requestId, sessionId: session.id, answer };
}

function contextualLookupMessage(message, session) {
  const words = String(message).trim().split(/\s+/).filter(Boolean);
  if ((words.length > 6 && !isDecisionExplorationQuestion(message)) || session.turns.length === 0) return message;

  const previousMessages = session.turns
    .slice(-3)
    .flatMap((turn) => [turn.userMessage, turn.assistantAnswer])
    .filter(Boolean);
  return [...previousMessages, message].join(" ");
}

async function handleDocumentRetrieval({ requestId, session, sessionStore, db, llmClient, arize, message, profile = {}, timing }) {
  const scope = await identifyDocumentScope({ llmClient, message, timing });
  const evidence = await timedStep(timing, "db.document_retrieval.search_documents", () =>
    db.searchDocuments({ topic: scope.topic || extractTopic(message) }),
  );

  if (evidence.length === 0) {
    return await handleFailure({ requestId, session, sessionStore, llmClient, arize, message, kind: "not_found", timing });
  }

  let answer = getEvidenceAnswerFromCache({ kind: "document", message, evidence });
  if (answer) {
    await timedStep(timing, "cache.document_retrieval.answer_hit", async () => answer);
  } else {
    answer = profile.guidedResponses
      ? null
      : await timedStep(timing, "document_retrieval.direct_answer", async () => composeDirectEvidenceAnswer({ message, evidence }));
  }

  if (!answer) {
    answer = await timedStep(timing, "llm.document_retrieval.answer_from_excerpts", () =>
      llmClient.generateAnswer({
        userMessage: renderPrompt("document-retrieval/answer-from-excerpts", {
          message,
          evidence,
          profileBrand: profile.brand || profile.assistantName || "the active business",
          profileOffers: formatOfferList(profile.offers || []),
        }),
      }),
    );
  }

  const evaluation = await timedStep(timing, "arize.groundedness", () =>
    arize.evaluate({ type: "groundedness", candidate: answer, evidence }),
  );
  if (evaluation.decision === "retry") {
    answer = await timedStep(timing, "llm.document_retrieval.retry_document_answer", () =>
      llmClient.generateAnswer({
        userMessage: renderPrompt("document-retrieval/retry-document-answer", { message, evidence }),
      }),
    );
  }

  session.pending = null;
  setEvidenceAnswerCache({ kind: "document", message, evidence, answer });
  sessionStore.save(addTurn(session, message, answer));
  return { requestId, sessionId: session.id, answer };
}

async function extractCustomerIdentifiers({ llmClient, message, timing }) {
  const identifiers = extractIdentifiersByRule(message);
  if (Object.keys(identifiers).length > 0) {
    return await timedStep(timing, "customer_context.extract_identifiers_rule", async () => ({ identifiers }));
  }

  return await timedStep(timing, "llm.customer_context.extract_identifiers", () =>
    llmClient.generateStructured({
      task: renderPrompt("customer-context-resolution/extract-identifiers"),
      context: { message },
      fallback: { identifiers: { raw: extractIdentifier(message) } },
    }),
  );
}

function extractIdentifiersByRule(message) {
  const text = String(message);
  const identifiers = {};
  const email = text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)?.[0];
  if (email) identifiers.email = email;
  const phone = text.match(/\b(?:\+?1[-.\s]?)?(?:\d{3}[-.\s]?){2}\d{4}\b/)?.[0] || text.match(/\b(?:\+?62|0)\d{7,13}\b/)?.[0];
  if (phone) identifiers.phone = phone;
  const accountId = text.match(/\bCW-\d+\b/i)?.[0] || text.match(/\b(?:acct|acc|account)[-_]?[a-z0-9]+\b/i)?.[0];
  if (accountId) identifiers.accountId = accountId;
  const policyNumber = text.match(/\bSB-\d{4,}\b/i)?.[0];
  if (policyNumber) identifiers.policyNumber = policyNumber;
  const trackingNumber = text.match(/\bPX-\d{4,}\b/i)?.[0];
  if (trackingNumber) identifiers.trackingNumber = trackingNumber;
  const bookingReference = text.match(/\b(?=[A-Z0-9]{6}\b)(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*\d)[A-Z0-9]+\b/)?.[0];
  if (bookingReference) identifiers.bookingReference = bookingReference;
  const name = text.match(/\b(?:my name is|contact name is)\s+([a-z]+(?:\s+[a-z]+){1,3})/i)?.[1];
  if (name) identifiers.name = name;
  const lastName = text.match(/\blast name is\s+([a-z'-]+)/i)?.[1];
  if (lastName) identifiers.lastName = lastName;
  return identifiers;
}

function customerContextSuccessMessage(profile = {}, session = {}) {
  const brand = profile.brand || profile.assistantName || "this service";
  const offers = Array.isArray(profile.offers) ? profile.offers.filter(Boolean) : [];
  if (profile.action && isActionContinuation(session)) {
    return "Thanks, I have the details needed to continue. Would you like me to proceed?";
  }
  if (offers.length === 0) {
    return `Thanks, I found your ${brand} details. What would you like help with?`;
  }
  return `Thanks, I found your ${brand} details. I can ${formatOfferList(offers)}. What would you like help with?`;
}

function isActionContinuation(session = {}) {
  const recentAssistantAnswers = (session.turns || [])
    .slice(-3)
    .map((turn) => turn.assistantAnswer)
    .filter(Boolean)
    .join(" ");
  return /\b(?:to|for) (?:book|reserve|finalize|create|open|place|schedule|submit|send|request)|what name should we put on (?:the )?order\b/i.test(
    recentAssistantAnswers,
  );
}

function formatOfferList(offers) {
  if (offers.length === 1) return offers[0];
  return `${offers.slice(0, -1).join(", ")}, or ${offers.at(-1)}`;
}

function countReferenceMatches(message, reference) {
  const normalizedMessage = normalizeForComparison(message);
  return Object.values(reference).filter((value) => {
    const normalizedValue = normalizeForComparison(value);
    return normalizedValue.length >= 4 && normalizedMessage.includes(normalizedValue);
  }).length;
}

function normalizeForComparison(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

async function handleAction({
  requestId,
  session,
  sessionStore,
  db,
  api,
  internalTools,
  llmClient,
  arize,
  message,
  profile = {},
  timing,
}) {
  if (profile.identification?.fields?.length > 0 && !session.customerContext) {
    return await handleCustomerContext({
      requestId,
      session,
      sessionStore,
      db,
      llmClient,
      arize,
      message,
      profile,
      timing,
    });
  }

  const action = await selectActionPath({ llmClient, message, profile, timing });

  const actionName = action.actionName || extractTopic(message);
  const result =
    action.path === "external_api"
      ? await timedStep(timing, "api.action.call_tool", () =>
          api.callTool({ actionName, integrationId: action.integration }),
        )
      : action.path === "internal_data"
        ? await timedStep(timing, "db.action.execute_data_change", () => db.executeDataChange({ actionName }))
        : await timedStep(timing, "tool.action.internal_method", () => internalTools.run({ actionName }));

  let answer = await timedStep(timing, "llm.action.result_response", () =>
    llmClient.generateAnswer({
      userMessage: renderPrompt("action-execution/action-result-response", {
        message,
        result,
        conversationHistory: JSON.stringify(session.turns.slice(-6)),
      }),
    }),
  );
  const evaluation = await timedStep(timing, "arize.action_response", () =>
    arize.evaluate({ type: "action_response", candidate: answer, evidence: [result] }),
  );
  if (evaluation.decision === "retry") answer = `Action result: ${result.result || result.status}`;

  session.pending = null;
  sessionStore.save(addTurn(session, message, answer));
  return { requestId, sessionId: session.id, answer };
}

async function selectDataSource({ llmClient, message, interpretation, profile = {}, timing }) {
  if (profile.dataSource) {
    return await timedStep(timing, "data_retrieval.select_source_profile", async () => ({
      source: profile.dataSource,
      topic: interpretation.entities?.topic || extractTopic(message),
    }));
  }
  const rule = selectDataSourceByRule(message, interpretation);
  if (rule) return await timedStep(timing, "data_retrieval.select_source_rule", async () => rule);

  return await timedStep(timing, "llm.data_retrieval.select_source", () =>
    llmClient.generateStructured({
      task: renderPrompt("data-retrieval/select-data-source"),
      context: { message, interpretation },
      fallback: { source: "internal", topic: interpretation.entities?.topic || extractTopic(message) },
    }),
  );
}

function selectDataSourceByRule(message, interpretation) {
  const text = String(message).toLowerCase();
  const topic = interpretation.entities?.topic || extractTopic(message);
  if (/\b(external|api|luar|supplier|third party|pihak ketiga)\b/i.test(text)) return { source: "external", topic };
  if (/\b(data|cari|lookup|policy|refund|status|inventory|availability|invoice|tracking|prescription|transaction|claim)\b|look up/i.test(text)) {
    return { source: "internal", topic };
  }
  return null;
}

async function identifyDocumentScope({ llmClient, message, timing }) {
  const rule = identifyDocumentScopeByRule(message);
  if (rule) return await timedStep(timing, "document_retrieval.identify_scope_rule", async () => rule);

  return await timedStep(timing, "llm.document_retrieval.identify_scope", () =>
    llmClient.generateStructured({
      task: renderPrompt("document-retrieval/identify-document-scope"),
      context: { message },
      fallback: { topic: extractTopic(message) },
    }),
  );
}

function identifyDocumentScopeByRule(message) {
  if (!/(dokumen|document|file|berkas)/i.test(message)) return null;
  return { topic: extractTopic(message) };
}

async function selectActionPath({ llmClient, message, profile = {}, timing }) {
  if (profile.action?.path) {
    return await timedStep(timing, "action.select_path_profile", async () => ({
      actionName: profile.action.name || extractTopic(message),
      path: profile.action.path,
      integration: profile.action.integration,
    }));
  }
  const rule = selectActionPathByRule(message);
  if (rule) return await timedStep(timing, "action.select_path_rule", async () => rule);

  return await timedStep(timing, "llm.action.select_path", () =>
    llmClient.generateStructured({
      task: renderPrompt("action-execution/select-action-path"),
      context: { message },
      fallback: { actionName: extractTopic(message), path: "internal_tool" },
    }),
  );
}

function selectActionPathByRule(message) {
  const text = String(message).toLowerCase();
  const actionName = extractTopic(message);
  if (/\b(external|api|luar|supplier|third party|pihak ketiga)\b/i.test(text)) return { actionName, path: "external_api" };
  if (/\b(db|database|data)\b/i.test(text)) return { actionName, path: "internal_data" };
  if (/\b(internal|buat|create|update|ubah|hapus|delete|kirim|send|trigger)\b/i.test(text)) return { actionName, path: "internal_tool" };
  return null;
}

async function handleFailure({ requestId, session, sessionStore, llmClient, arize, message, kind, timing }) {
  const prompt =
    kind === "unsupported"
      ? renderPrompt("failure-refusal-recovery/unsupported-response", { message })
      : renderPrompt("failure-refusal-recovery/recovery-response", { message });
  let answer = await timedStep(timing, "llm.failure_response", () => llmClient.generateAnswer({ userMessage: prompt }));
  const evaluation = await timedStep(timing, `arize.${kind === "unsupported" ? "unsupported" : "recovery"}`, () =>
    arize.evaluate({ type: kind === "unsupported" ? "unsupported" : "recovery", candidate: answer }),
  );
  if (evaluation.decision === "retry") {
    answer = kind === "unsupported" ? "I cannot support that request yet." : "I could not find matching data. Can you provide another detail?";
  }

  session.pending = kind === "not_found" ? { type: "clarification", originalMessage: message, reason: "data_not_found" } : null;
  sessionStore.save(addTurn(session, message, answer));
  return { requestId, sessionId: session.id, answer };
}

function addTurn(session, userMessage, assistantAnswer) {
  return {
    ...session,
    turns: [
      ...session.turns,
      {
        at: new Date().toISOString(),
        userMessage,
        assistantAnswer,
      },
    ].slice(-20),
  };
}

async function timedStep(timing, step, run) {
  if (!TIMING_LOG_ENABLED) return await run();

  const startedAt = performance.now();
  try {
    return await run();
  } finally {
    const durationMs = Math.round(performance.now() - startedAt);
    console.log(
      JSON.stringify({
        type: "engine_timing",
        requestId: timing.requestId,
        sessionId: timing.sessionId,
        step,
        durationMs,
      }),
    );
  }
}

function getEvidenceAnswerFromCache({ kind, message, evidence }) {
  return getCache(evidenceAnswerCache, cacheKeyForEvidence({ kind, message, evidence }));
}

function setEvidenceAnswerCache({ kind, message, evidence, answer }) {
  setCache(evidenceAnswerCache, cacheKeyForEvidence({ kind, message, evidence }), answer);
}

function composeDirectEvidenceAnswer({ message, evidence }) {
  if (evidence.length === 0) return null;

  const selected = selectDirectEvidenceItems({ message, evidence });
  const snippets = selected
    .map((item) => item.summary || item.excerpt || item.text || item.description)
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0);

  if (snippets.length === 0) return null;
  const answer = snippets.join(" ");
  if (answer.length > 450) return null;

  if (/^(apa|bagaimana|jelaskan|lihat|cari|lookup|data|dokumen|document)\b/i.test(String(message).trim())) {
    return ensureSentence(answer);
  }

  return null;
}

function composeContextualEvidenceAnswer({ message, evidence, profile = {} }) {
  if (!profile.guidedResponses) return null;
  const text = String(message).toLowerCase();
  const selected = selectDirectEvidenceItems({ message, evidence });
  const booking = selected.find((item) => /\bbooking\b/i.test([item.id, item.topic, item.title].filter(Boolean).join(" ")));
  if (booking && /\b(options?|alternatives?|\d{1,2}:\d{2})\b/i.test(text)) {
    const summary = ensureSentence(booking.summary || booking.excerpt || booking.text || booking.title);
    if (/\b\d{1,2}:\d{2}\b/.test(text)) return `${summary} Would you like to proceed with this change?`;
    return `${summary} Does the available later flight work for you?`;
  }
  return null;
}

function selectDirectEvidenceItems({ message, evidence }) {
  const text = String(message).toLowerCase();
  const scored = evidence
    .map((item) => ({
      item,
      score: directEvidenceScore(text, item),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ item }) => item);

  const selected = scored.length > 0 ? scored : evidence;
  return selected.slice(0, 2);
}

function directEvidenceScore(message, item) {
  const haystack = normalizeForCache([item.topic, item.title, item.summary, item.excerpt, item.text].filter(Boolean).join(" "));
  let score = 0;
  for (const word of normalizeForCache(message).split(" ").filter((part) => part.length > 3)) {
    if (haystack.includes(word)) score += 1;
  }
  if (/\bpolicy|kebijakan\b/i.test(message) && (item.text || /policy|kebijakan/i.test(String(item.title || "")))) score += 4;
  if (/\bdokumen|document|file|berkas\b/i.test(message) && item.excerpt) score += 4;
  if (/\bstatus|record|data\b/i.test(message) && item.summary) score += 3;
  return score;
}

function ensureSentence(value) {
  const text = String(value || "").trim();
  if (!text) return text;
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function getCache(cache, key) {
  if (!CACHE_ENABLED) return null;
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(cache, key, value) {
  if (!CACHE_ENABLED || !value) return;
  cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

function cacheKeyForMessage(message, profile = {}, conversationHistory = []) {
  return `${normalizeForCache(profile.id || "default")}:${normalizeForCache(message)}:${hashValue(conversationHistory)}`;
}

function cacheKeyForEvidence({ kind, message, evidence }) {
  return `${kind}:${normalizeForCache(message)}:${hashValue(
    evidence.map((item) => ({
      id: item.id,
      title: item.title,
      topic: item.topic,
      summary: item.summary,
      excerpt: item.excerpt,
      text: item.text,
    })),
  )}`;
}

function hashValue(value) {
  return createHash("sha1").update(JSON.stringify(value)).digest("hex");
}

function normalizeForCache(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function extractTopic(message) {
  return String(message)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 4)
    .join(" ");
}

function extractIdentifier(message) {
  const email = String(message).match(/[^\s@]+@[^\s@]+\.[^\s@]+/)?.[0];
  if (email) return email;
  const phone = String(message).match(/\b\d{6,}\b/)?.[0];
  if (phone) return phone;
  return extractTopic(message);
}
