import { FunctionTool } from "@google/adk";
import { z } from "zod";

export function createBusinessTools({ profile, db, api, internalTools, arize }) {
  const tools = [
    new FunctionTool({
      name: "get_business_context",
      description:
        "Returns the active business identity, supported customer journeys, identification rules, verification rules, and configured action.",
      parameters: z.object({}),
      execute: async () => ({
        business: {
          id: profile.id,
          name: profile.brand,
          domain: profile.domain,
          useCase: profile.useCase,
          offers: profile.offers || [],
          decisionGuidance: profile.decisionGuidance || "",
        },
        identification: profile.identification || { mode: "none", fields: [] },
        verification: profile.verification || { required: false, fields: [], minimumMatches: 0 },
        action: profile.action || null,
      }),
    }),

    new FunctionTool({
      name: "search_business_data",
      description:
        "Searches configured Firestore business records, policies, inventory, schedules, transactions, claims, or other profile data. Set customerData true only for customer-specific or protected records.",
      parameters: z.object({
        topic: z.string().describe("Natural-language topic containing all known customer criteria."),
        customerData: z.boolean().default(false).describe("Whether the request accesses customer-specific data."),
      }),
      execute: async ({ topic, customerData }, context) => {
        const access = checkProtectedAccess({ profile, context, customerData });
        if (!access.allowed) return access;
        const records = await db.queryData({ topic });
        return {
          status: "success",
          topic,
          count: records.length,
          records,
        };
      },
    }),

    new FunctionTool({
      name: "search_business_documents",
      description:
        "Searches configured Firestore documents and policy excerpts for terms, conditions, service guidance, warranties, exchanges, eligibility, or operational rules.",
      parameters: z.object({
        topic: z.string().describe("Document or policy topic to search."),
      }),
      execute: async ({ topic }) => {
        const documents = await db.searchDocuments({ topic });
        return {
          status: "success",
          topic,
          count: documents.length,
          documents,
        };
      },
    }),

    new FunctionTool({
      name: "identify_customer",
      description:
        "Matches customer-provided identifying details against Firestore. Use only when the active profile requires identification for customer-specific service.",
      parameters: z.object({
        identifiers: z.array(z.string()).min(1).describe("Identity values explicitly provided by the customer."),
      }),
      execute: async ({ identifiers }, context) => {
        if (!profile.identification?.fields?.length) {
          return { status: "not_required", identified: true };
        }

        const values = Object.fromEntries(identifiers.map((value, index) => [`value${index + 1}`, value]));
        const matches = await db.searchCustomers(values);
        if (matches.length !== 1) {
          context?.state.set("customerIdentified", false);
          context?.state.set("customerId", null);
          return {
            status: matches.length === 0 ? "not_found" : "ambiguous",
            identified: false,
            matchCount: matches.length,
            requiredFields: profile.identification.fields,
          };
        }

        const customer = matches[0];
        context?.state.set("customerIdentified", true);
        context?.state.set("customerId", customer.id);
        context?.state.set("customerVerified", false);
        return {
          status: "success",
          identified: true,
          customerId: customer.id,
        };
      },
    }),

    new FunctionTool({
      name: "verify_customer",
      description:
        "Compares private answers supplied by an identified customer with their Firestore reference data. Never reveal the reference values.",
      parameters: z.object({
        answers: z.array(z.string()).min(1).describe("Verification answers explicitly supplied by the customer."),
      }),
      execute: async ({ answers }, context) => {
        if (!profile.verification?.required) {
          context?.state.set("customerVerified", true);
          return { status: "not_required", verified: true };
        }

        const customerId = context?.state.get("customerId");
        if (!customerId) {
          return {
            status: "identification_required",
            verified: false,
            requiredIdentificationFields: profile.identification?.fields || [],
          };
        }

        const reference = await db.getCustomerReference(customerId);
        if (!reference) return { status: "reference_not_found", verified: false };

        const allowedFields = profile.verification.fields || [];
        const referenceValues = allowedFields.map((field) => reference[field]).filter(Boolean);
        const matches = answers.filter((answer) =>
          referenceValues.some((value) => normalizeComparable(answer) === normalizeComparable(value)),
        ).length;
        const minimumMatches = Number(profile.verification.minimumMatches || 1);
        const verified = matches >= minimumMatches;
        context?.state.set("customerVerified", verified);
        context?.state.set("verificationMatches", matches);

        return {
          status: verified ? "success" : "failed",
          verified,
          matches,
          minimumMatches,
        };
      },
    }),

    new FunctionTool({
      name: "execute_business_action",
      description:
        "Executes the configured business action only after explicit customer confirmation and any required identification and verification.",
      parameters: z.object({
        actionName: z.string().describe("The configured action the customer explicitly confirmed."),
        confirmationText: z.string().describe("The customer's exact confirmation message."),
      }),
      execute: async ({ actionName, confirmationText }, context) => {
        if (!isExplicitConfirmation(confirmationText)) {
          return { status: "confirmation_required", completed: false };
        }
        const access = checkProtectedAccess({ profile, context, customerData: true, action: true });
        if (!access.allowed) return { ...access, completed: false };

        const configuredAction = profile.action;
        if (!configuredAction) return { status: "unsupported", completed: false };
        const effectiveActionName = configuredAction.name || actionName;
        const result =
          configuredAction.path === "external_api"
            ? await executeExternalActionWithLocalReference({
                actionName: effectiveActionName,
                integrationId: configuredAction.integration,
                api,
                db,
              })
            : configuredAction.path === "internal_data"
              ? await db.executeDataChange({ actionName: effectiveActionName })
              : await internalTools.run({ actionName: effectiveActionName });

        context?.state.set("lastAction", result);
        const customerMessage = formatActionCustomerMessage(result);
        context?.state.set("actionResponsePending", true);
        context?.state.set("actionCustomerMessage", customerMessage);
        await arize.evaluate({
          type: "action_result",
          candidate: result,
          evidence: [result],
          decision: result.status === "completed" ? "pass" : "review",
        });
        return {
          status: result.status || "completed",
          completed: result.status !== "unavailable",
          result,
          customerMessage,
        };
      },
    }),
  ];

  if (Object.keys(profile.externalIntegrations || {}).length > 0) {
    tools.push(
      new FunctionTool({
        name: "query_external_service",
        description:
          "Queries a configured external business API when the active profile explicitly depends on external information.",
        parameters: z.object({
          topic: z.string().describe("The external information needed."),
          integrationId: z.string().describe("A configured integration ID from the business context."),
        }),
        execute: async ({ topic, integrationId }) => {
          if (!profile.externalIntegrations[integrationId]) {
            return { status: "unsupported_integration", available: false };
          }
          return await api.queryData({ topic, integrationId });
        },
      }),
    );
  }

  return tools;
}

export async function executeConfiguredAction({ profile, db, api, internalTools, actionName }) {
  const configuredAction = profile.action;
  if (!configuredAction) return { status: "unsupported", completed: false };

  const effectiveActionName = configuredAction.name || actionName;
  if (configuredAction.path === "external_api") {
    return await executeExternalActionWithLocalReference({
      actionName: effectiveActionName,
      integrationId: configuredAction.integration,
      api,
      db,
    });
  }
  if (configuredAction.path === "internal_data") {
    return await db.executeDataChange({ actionName: effectiveActionName });
  }
  return await internalTools.run({ actionName: effectiveActionName });
}

function checkProtectedAccess({ profile, context, customerData, action = false }) {
  if (!customerData) return { allowed: true };
  const identificationRequired = profile.identification?.requiredBeforeData || profile.verification?.required;
  if (identificationRequired && profile.identification?.fields?.length && !context?.state.get("customerIdentified", false)) {
    return {
      allowed: false,
      status: "identification_required",
      requiredFields: profile.identification.fields,
    };
  }
  if (profile.verification?.required && !context?.state.get("customerVerified", false)) {
    return {
      allowed: false,
      status: "verification_required",
      verificationFields: profile.verification.fields,
      minimumMatches: profile.verification.minimumMatches,
    };
  }
  return { allowed: true, action };
}

export function isExplicitConfirmation(value) {
  return /\b(yes|confirm|confirmed|go ahead|place it|book it|submit it|do it|proceed|iya|ya|setuju|lanjutkan)\b/i.test(
    String(value || ""),
  );
}

function normalizeComparable(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function formatActionCustomerMessage(result) {
  if (result.ticketId) {
    return `The action was completed successfully. Your reference number is ${result.ticketId}.`;
  }
  if (result.result && !isInternalFacingResult(result.result)) return String(result.result);
  return `The action finished with status: ${result.status || "completed"}.`;
}

async function executeExternalActionWithLocalReference({ actionName, integrationId, api, db }) {
  const externalResult = await api.callTool({ actionName, integrationId });
  if (externalResult.status === "unavailable") return externalResult;

  const localRecord = await db.executeDataChange({ actionName });
  return {
    ...externalResult,
    ...localRecord,
    externalResult,
    status: externalResult.status || localRecord.status || "completed",
  };
}

function isInternalFacingResult(value) {
  return /\b(mock|external tool|internal|api|tool completed)\b/i.test(String(value || ""));
}
