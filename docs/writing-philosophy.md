# Writing Philosophy

This document defines the writing style for Grounded Agentic AI materials. It is not the product scope, architecture, or implementation strategy. Product scope must come from the separate scope document. This file only defines how the material should be written.

## Start From The Reader's Situation

Do not assume the reader already understands agentic AI, governance, evals, guardrails, or enterprise AI platforms. Start from a situation they can recognize: an organization wants AI to help with communication, but does not want AI to answer too freely.

The reader should first feel the business tension. AI can make responses faster, but not every question should be answered, not every piece of information should be disclosed, and not every request should trigger an action.

Do not open with jargon or large claims. Start from the practical problem.

## Business Need First, Terms Later

Do not begin with tools, models, frameworks, or vendors. Begin with the business need, then introduce the concept after the problem is clear.

Preferred structure:

1. Real situation.
2. Felt problem.
3. Why a normal chatbot or automation flow is not enough.
4. Concept that explains the problem.
5. Practical implication.

Terms such as agent, governance, evaluation, audit, classification, eligibility, retrieval, query, action, and semantic matching can be used, but they should appear as answers to the problem, not as opening jargon.

## Keep Product Logic Separate From Writing Style

Do not invent product scope, decision flow, internal mechanics, or architecture. Those details must come from the source scope document supplied with the writing task.

When asked to rewrite or polish a scope document, preserve the original product logic and improve only the structure, clarity, wording, and transitions. Do not add new controls, examples, use cases, or implementation details unless the source explicitly includes them.

Do not turn scope into a feature list, sales page, UX journey, or generic AI governance article. The writing should make the provided logic easier to understand without changing the logic itself.

## Narrative, Not Slides

Use paragraphs to explain cause and effect. Do not write like an expanded slide deck. Bullets are acceptable for recap, short lists, and summaries after the idea has already been explained.

The writing should feel like the reader is being guided through a business problem step by step.

## Natural, Precise Language

Use clear, concrete English. Avoid exaggerated phrasing, vague consultant language, and generic AI marketing terms.

Prefer:

- "The system needs to know whether this user can receive that information."
- "Two questions can sound similar but carry different business meaning."
- "The wording can change, but the approved meaning must stay the same."

Avoid:

- "Responsible AI orchestration."
- "Autonomous trust enablement."
- "Holistic governance transformation."
- "Comprehensive AI safety framework."

## Do Not Make It Tool-Centric

Models, APIs, observability platforms, and cloud services are implementation choices. Do not make them the center of the story unless the section is specifically about implementation.

The reader should first understand why the system needs question boundaries, information classification, eligibility, action boundaries, standard responses, and auditability. Technology can be mentioned after that.

## Do Not Write A Moral Essay

Do not frame the product as a moral or ethical authority. The writing should explain business control, not define values for an organization.

Use this framing:

- The organization defines the boundaries.
- The system enforces the boundaries.
- Decisions must be explainable.
- Answers and actions must follow the defined rules.

Avoid framing the system as deciding what is universally "good", "safe", or "right".

## Explain Through Concrete Distinctions

Use distinctions that make the product easier to understand:

- Relevant does not always mean disclosable.
- Retrievable does not always mean shareable.
- Similar wording does not always mean the same business intent.
- A response can sound correct but still be disallowed.
- An action can be technically possible but not authorized.

These distinctions help readers understand why the product is different from a normal chatbot or RAG application.

## One Section, One Idea

Do not overload one section with too many concepts. If a section explains identity context, do not also deeply explain action execution. If a section explains semantic matching, do not also turn it into a long audit discussion.

Each section should carry one main idea and lead naturally to the next one.

## Public Writing Should Be Minimal

For README files or public materials, do not expose unnecessary internal mechanics.

Public writing should explain the problem, the product direction, and technology at a high level. Details such as gate logic, evaluator design, standard response taxonomy, scoring, and implementation sequence should stay private unless explicitly approved for publication.

## End With Practical Meaning

The ending should help the reader understand the practical consequence.

The reader should finish with this idea: the product is not built so AI can answer more things. It is built so AI answers, discloses information, and acts only when the business boundary allows it.
