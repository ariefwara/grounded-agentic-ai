# AI Customer Service Engine

Turn business data, policies, and operational tools into customer conversations that can guide decisions and complete real work.

The product is a reusable engine for building business-specific AI assistants. Each deployment can have its own brand, conversation style, customer journey, data model, verification rules, integrations, and chat appearance. Gemini helps interpret every turn and compose natural responses, while the engine keeps the conversation connected to configured business capabilities.

## What Customers Experience

Customers do not need to know which feature, database, or workflow they need. They can start with short messages such as:

> I need an air fryer.

> My delivery is late.

> I want to book something for my skin.

The assistant explains what it can help with, asks focused questions, presents useful options, resolves uncertainty, and proposes a clear next step. When an action is available, it collects the required details and asks for confirmation before executing it.

## What Businesses Gain

- **A proactive service experience.** The assistant guides customers instead of waiting for perfectly written requests.
- **More confident decisions.** It compares realistic options using prices, specifications, availability, policies, and customer priorities.
- **Business-aware persuasion.** It turns legitimate strengths such as warranties, exchanges, flexible scheduling, and service guarantees into reasons to proceed.
- **Connected service.** It can read internal Firestore data, call configured external APIs, run internal methods, and return the actual result.
- **Appropriate customer verification.** Public conversations remain frictionless, while sensitive requests can require business-specific identity checks.
- **Reusable deployments.** One engine can support distinct businesses through profile configuration instead of separate conversation code.
- **Observable AI behavior.** Arize evaluation hooks and timing logs make response quality and latency visible during development and production.
- **Repeatable demonstrations.** Browser-based scenarios reset their data, run a complete customer story, and show the result in the real chat UI.

## A Complete Customer Journey

The engine supports more than question answering. A conversation can move through:

1. A branded welcome and capability introduction.
2. Intent and context understanding across multiple turns.
3. Guided discovery of needs, preferences, and constraints.
4. Retrieval from internal data, business documents, or external services.
5. Comparison of multiple viable options.
6. A recommendation supported by relevant evidence.
7. Objection handling using applicable policy and operational facts.
8. Customer identification or verification when the request requires it.
9. Explicit confirmation before a business action.
10. Action execution with a real reference or result.
11. Recovery when information is missing, unsupported, or inconsistent.

The path is not fixed. A retail shopper, property lead, clinic customer, airline passenger, pharmacy customer, policyholder, and banking customer can each follow a different journey.

## Product Architecture

The system is organized as independent applications:

- **Engine:** Google ADK orchestration, Gemini interaction, conversation sessions, data access, integrations, controls, and action execution behind an HTTP API.
- **Web chat:** Angular and DaisyUI customer interface with profile-specific branding and direct engine communication.
- **Simulator:** Scenario runner that seeds Firestore and drives realistic conversations through the visible web chat.
- **Mock API:** Configurable external service used where a scenario needs an integration without a live provider.
- **Documentation:** Astro application for product and solution documentation.

Each application has its own package definition and Dockerfile. Docker Compose coordinates the applications locally.

## Profile-Driven Deployment

A profile is an application configuration for one business, not a test case. Engine profiles use separate YAML files for:

- Business identity, domain, and supported services.
- Conversation behavior and decision guidance.
- Firestore collections and retrieval configuration.
- External integrations and action paths.

The web chat has matching YAML configuration for identity and appearance. The simulator starts the engine and UI with only the selected profile name, then loads scenario data separately from JSON.

The repository currently includes a generic profile and ten business profiles spanning retail, coffee, property, beauty, delivery, travel, streaming, pharmacy, insurance, and banking.

## Current Boundaries

The current implementation is a development platform and demonstrator. It provides working multi-turn orchestration, profile configuration, Firestore retrieval, configurable integrations, action execution, evaluation hooks, and end-to-end simulation.

Production deployment still requires business-owned decisions for authentication, authorization, privacy, retention, human escalation, integration credentials, operational monitoring, and domain-specific compliance. The engine supplies the control points; each deployment must configure and validate them for its own risk.

## Start Exploring

Begin with **Guided Conversations** to see how the assistant leads customers forward, then explore **Confident Decisions**, **Adaptive Trust**, **Completed Actions**, and **Business-Specific Experiences**.
