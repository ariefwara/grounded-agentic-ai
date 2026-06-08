# AI Customer Service Engine

Most businesses already meet customers online, but many still cannot guide them the way a good human service team would.

Human support understands context, but it is expensive, limited by operating hours, and difficult to scale. Traditional chatbots are always available, but they often depend on menus and scripted flows.

This project is an agentic AI customer-service system that helps businesses turn online conversations into guided decisions and completed actions.

Repository: https://github.com/ariefwara/ai-customer-service-engine

Demo Video: https://youtu.be/lSspLmAXyvE

## What It Does

The same reusable engine adapts across ten business scenarios:

1. **Retail product guidance** - compares available items and uses exchange policy to reduce purchase hesitation.
2. **Coffee catering** - turns a short event request into a ready-to-fulfill order.
3. **Real estate tour scheduling** - guides a prospect from preferences to a tour appointment.
4. **Beauty consultation** - explains relevant treatment directions while preserving professional boundaries.
5. **Parcel tracking** - reads shipment status and escalates only when policy supports it.
6. **Flight booking** - compares schedule, price, and convenience before booking.
7. **Subscription billing** - verifies the customer, explains charge status, and opens a case when justified.
8. **Pharmacy refill** - verifies identity, retrieves prescription records, and submits the correct request.
9. **Insurance claim assistance** - combines claim data and policy guidance before scheduling inspection.
10. **Bank card dispute** - verifies the customer, reviews transaction state, and opens a dispute after confirmation.

Across these scenarios, the goal is not only to answer questions. The goal is to guide customers toward clear outcomes while keeping the business in control.

## Stack

- **Conversation Engine with Google ADK** manages agent orchestration, session state, business tools, policy-aware instructions, data access, external services, and action confirmation.
- **Gemini** helps understand each customer message, ask follow-up questions, compare options, and compose natural responses.
- **Firestore** stores business data for each profile, including products, schedules, records, policies, and customer context.
- **Google Cloud Run** can deploy the web chat, engine, mock API, and documentation as services.
- **Arize / Phoenix** provides observability and evaluation for AI behavior in development and production.

## Repository Layout

There is no root `package.json`. Each npm project owns its own dependencies.

```text
engine/          ADK runtime, HTTP API, profiles, prompts, policies, data access
apps/web-chat/  Angular chat interface with per-business UI profiles
apps/simulator/ Playwright simulator and Firestore seed scenarios
apps/mock-api/  Mock external APIs/tools for local simulations
docs/           Astro documentation site
```

## Requirements

- npm
- Docker, optional
- Google Cloud CLI, when using Firestore
- Application Default Credentials for Firestore

```bash
gcloud auth application-default login
gcloud auth login
```

Create local environment config:

```bash
cp .env.example .env
```

Set at minimum:

```bash
GCP_PROJECT=your-project-id
FIRESTORE_PROJECT_ID=your-project-id
FIRESTORE_DATABASE_ID=(default)
ENGINE_PROFILE_ID=retail
ADK_MODEL=gemini-2.5-flash
GOOGLE_GENAI_USE_VERTEXAI=TRUE
```

## Install

Install dependencies inside each project:

```bash
cd engine && npm install
cd ../apps/web-chat && npm install
cd ../simulator && npm install
cd ../mock-api && npm install
cd ../../docs && npm install
```

## Run Locally

Start the mock external API:

```bash
cd apps/mock-api
npm start
```

Start the engine:

```bash
cd engine
ENGINE_PROFILE_ID=retail npm start
```

Start the web chat:

```bash
cd apps/web-chat
npm start
```

Open:

```text
http://localhost:4200?profile=retail
```

## Run With Docker Compose

```bash
docker compose up --build engine web-chat mock-api docs
```

Services:

```text
web-chat: http://localhost:4200
engine:   http://localhost:3000
mock-api: http://localhost:3002
docs:     http://localhost:4321
```

## Run Simulations

The simulator resets and seeds Firestore for the selected scenario, starts the mock API, engine, and web chat, opens Chrome, and drives the conversation.

```bash
cd apps/simulator
npm start -- retail-shopping
```

Scenario order:

```text
retail-shopping
coffee-catering
real-estate-tour
beauty-consultation
parcel-tracking
flight-booking
subscription-billing
pharmacy-refill
insurance-claim
banking-dispute
```

Seed Firestore without opening the browser:

```bash
SIMULATOR_SEED_ONLY=1 npm start -- banking-dispute
```

## Documentation

Published documentation:

```text
https://agentic-ai-e6e15.web.app
```

Run locally:

```bash
cd docs
npm run dev
```

Open:

```text
http://localhost:4321
```

Build and serve:

```bash
npm run build
npm start
```

Deploy to Firebase Hosting:

```bash
cd docs
DOCS_BASE_PATH=/ npm run build
cd ..
npx firebase-tools deploy --only hosting --project agentic-ai-e6e15
```

## Tests

```bash
cd engine && npm test
cd ../apps/mock-api && npm test
cd ../simulator && npm test
cd ../web-chat && npm run build
```

## Notes

- Business profiles are configured in YAML under `engine/config/profiles/<profile>/`.
- Web chat profiles are configured under `apps/web-chat/public/config/profiles/<profile>/`.
- Simulation seed data is JSON under `apps/simulator/scenarios/<scenario>/seed/`.
- ADK prompts are stored as one prompt template per file under `engine/prompts/adk/`.
- Keep secret values in local environment variables.
