# Simulator

The simulator resets and seeds a Firestore namespace, starts the mock API, engine, and web chat, then drives a visible Chrome session through the configured conversation.

Each scenario stores only a profile ID plus its simulation data. Scenario metadata is YAML, while DB seed data is JSON:

```text
scenarios/<scenario-id>/
  scenario.yaml
  seed/
    customers.json
    policies.json
    documents.json
    records.json
```

The applications own their profile configurations:

- web-chat loads its local UI profile from `?profile=<profile-id>`;
- engine loads its local business profile from `ENGINE_PROFILE_ID`;
- story and conversation sequence;
- Firestore namespace and initial state;
- customer identification and verification requirements;
- deterministic action ticket prefix and starting number.

## Requirements

```bash
gcloud auth application-default login
export GCP_PROJECT=your-project-id
```

## Run

```bash
npm start -- retail-shopping
npm start -- beauty-consultation
npm start -- banking-dispute
```

For example, `npm start -- banking-dispute` starts the engine with
`ENGINE_PROFILE_ID=banking` and opens web-chat with
`?profile=banking`. The `/chat` payload does not contain profile
configuration.

Scenario IDs describe use cases, while profile IDs describe application
deployments. Running the simulator without a scenario is rejected instead of
selecting a business use case as a default.

Seed and reset Firestore without opening the browser:

```bash
SIMULATOR_SEED_ONLY=1 npm start -- insurance-claim
```

## Scenario Order

The scenarios progress from public, low-sensitivity support to protected financial support:

1. `retail-shopping`
2. `coffee-catering`
3. `real-estate-tour`
4. `beauty-consultation`
5. `parcel-tracking`
6. `flight-booking`
7. `subscription-billing`
8. `pharmacy-refill`
9. `insurance-claim`
10. `banking-dispute`

The detailed design rules are in [SIMULATION-DESIGN.md](./SIMULATION-DESIGN.md).

## Check

```bash
node --check src/index.js
node --check src/scenario-catalog.js
```
