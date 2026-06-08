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
      { slug: "solution/system-sequence", title: "Technical Architecture" },
      { slug: "solution/general-request-flow", title: "Request Flow" },
      { slug: "solution/sequences/conversation-entry", title: "Conversation Lifecycle" },
      { slug: "solution/sequences/action-execution", title: "Protected Actions" },
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
