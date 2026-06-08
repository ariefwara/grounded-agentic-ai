# Engine

Policy-first Node.js engine for governed AI business communication.

Run from this folder:

```bash
npm test
npm start
```

## Profile

The engine loads one business profile when the process starts:

```bash
export ENGINE_PROFILE_ID=banking
npm start
```

Profile configuration is YAML under:

```text
config/profiles/<profile>/
  business.yaml
  conversation.yaml
  data.yaml
  integrations.yaml
  integrations/
    <external-capability>.yaml
```

`generic` is the default profile. Clients do not send identification,
verification, data-source, or action-path configuration in `/chat` requests.

`data.yaml` owns the Firestore connection environment mapping, namespace,
collection mapping, searchable fields, preload list, and action storage.
External integration files own the endpoint environment name, HTTP operation,
authentication environment mapping, and timeout. Secret values remain in
environment variables.

## Firestore

Runtime engine memakai Firestore sebagai DB internal.

```bash
export GCP_PROJECT=your-project-id
export FIRESTORE_PROJECT_ID=your-project-id
export FIRESTORE_DATABASE_ID="(default)"
export FIRESTORE_SIMULATION_ID=retail-refund
```

Simulator akan seed data ke:

```text
simulationDatabases/{FIRESTORE_SIMULATION_ID}
```

Firestore collection cache aktif secara default untuk mengurangi read berulang.

```bash
export INTERNAL_DB_CACHE=on
export INTERNAL_DB_PRELOAD=on
export INTERNAL_DB_CACHE_TTL_MS=300000
```

## Response Cache

Relevant answer dan evidence answer cache aktif secara default.

```bash
export ENGINE_RESPONSE_CACHE=on
export ENGINE_RESPONSE_CACHE_TTL_MS=300000
export ENGINE_RESPONSE_CACHE_MAX_ENTRIES=200
```

## External API

External data/tools diarahkan lewat:

```bash
export EXTERNAL_API_URL=http://localhost:3002
```

## Arize / Phoenix

Engine bisa mengirim evaluator spans ke Phoenix/Arize.

```bash
export ARIZE_ENABLED=on
export ARIZE_PROJECT_NAME=ai-assistant-engine
export PHOENIX_COLLECTOR_ENDPOINT=https://app.phoenix.arize.com
export PHOENIX_API_KEY=your-phoenix-api-key
```

Runtime decision tetap punya fallback lokal. Phoenix/Arize digunakan untuk observability dan online evaluation pada traces; evaluator task di Arize dapat dikonfigurasi untuk menilai spans yang dikirim.

## Prompts

Prompt Gemini disimpan di:

```text
prompts/<sequence-step>/*.prompt.md
```

Setiap file berisi satu template prompt. Folder prompt mengikuti step sequence seperti `conversation-routing`, `data-retrieval`, dan `failure-refusal-recovery`. Engine memuat prompt lewat `src/prompts/prompt-loader.js`.
