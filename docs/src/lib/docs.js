import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { marked } from "marked";

const contentRoot = resolve(process.cwd());

export const docGroups = [
  {
    title: "Overview",
    items: [{ slug: "product-scope", title: "Product Scope" }],
  },
  {
    title: "Features",
    items: [
      {
        slug: "features/guided-conversations",
        title: "Guided Conversations",
      },
      {
        slug: "features/confident-decisions",
        title: "Confident Decisions",
      },
      {
        slug: "features/adaptive-trust",
        title: "Adaptive Trust",
      },
      {
        slug: "features/completed-actions",
        title: "Completed Actions",
      },
      {
        slug: "features/business-specific-experiences",
        title: "Business-Specific Experiences",
      },
    ],
  },
  {
    title: "Solution",
    items: [
      { slug: "solution/general-request-flow", title: "Conversation Flow" },
      { slug: "solution/system-sequence", title: "System Sequence" },
      { slug: "solution/sequences/conversation-entry", title: "Conversation Entry" },
      { slug: "solution/sequences/intent-understanding", title: "Conversation Routing" },
      { slug: "solution/sequences/relevant-answer", title: "Relevant Answer" },
      { slug: "solution/sequences/clarification-flow", title: "Clarification Flow" },
      { slug: "solution/sequences/customer-context-resolution", title: "Customer Context Resolution" },
      { slug: "solution/sequences/eligibility-verification", title: "Customer Verification" },
      { slug: "solution/sequences/data-retrieval", title: "Data Retrieval" },
      { slug: "solution/sequences/document-retrieval", title: "Document Retrieval" },
      { slug: "solution/sequences/action-execution", title: "Action Execution" },
      { slug: "solution/sequences/correction-intent-change-cancel", title: "Correction / Intent Change / Cancel" },
      { slug: "solution/sequences/failure-refusal-recovery", title: "Unsupported / Recovery" },
    ],
  },
];

const docsBySlug = new Map(docGroups.flatMap((group) => group.items).map((item) => [item.slug, item]));

export function getDocumentSlugs() {
  return [...docsBySlug.keys()];
}

export async function getDocument(slug) {
  const item = docsBySlug.get(slug);
  if (!item) return null;

  const markdown = await readFile(resolve(contentRoot, `${slug}.md`), "utf8");
  return {
    ...item,
    html: await marked.parse(markdown),
  };
}
