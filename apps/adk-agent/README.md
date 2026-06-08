# ADK Agent

Google ADK wrapper for AI Customer Service Engine.

The ADK agent exposes a `rootAgent` with one function tool:

- `chat_with_business_engine` sends the customer turn to the existing policy-first engine.

The engine remains responsible for profile configuration, Firestore retrieval, policy checks, customer verification, action execution, and Arize/Phoenix evaluation.

## Install

```bash
npm install
```

## Run With ADK CLI

Start the engine first, then run:

```bash
ENGINE_URL=http://localhost:3000 npm run adk:run
```

## Run ADK Web

```bash
ENGINE_URL=http://localhost:3000 npm run adk:web
```

## Smoke Test

```bash
ENGINE_URL=http://localhost:3000 npm run smoke -- "Hi."
```
