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
npm start -- bullseye-market
npm start -- glowphora-consultation
npm start -- chasewood-bank
```

For example, `npm start -- chasewood-bank` starts the engine with
`ENGINE_PROFILE_ID=chasewood` and opens web-chat with
`?profile=chasewood`. The `/chat` payload does not contain profile
configuration.

Scenario IDs describe use cases, while profile IDs describe application
deployments. Running the simulator without a scenario is rejected instead of
selecting a business use case as a default.

Seed and reset Firestore without opening the browser:

```bash
SIMULATOR_SEED_ONLY=1 npm start -- statebarn-claim
```

## Scenario Order

The scenarios progress from public, low-sensitivity support to protected financial support:

1. `bullseye-market`
2. `starbeans-catering`
3. `zilloh-home-tour`
4. `glowphora-consultation`
5. `parcelex-tracking`
6. `deltaway-flight-booking`
7. `netflicks-billing`
8. `medigreen-refill`
9. `statebarn-claim`
10. `chasewood-bank`

The detailed design rules are in [SIMULATION-DESIGN.md](./SIMULATION-DESIGN.md).

## Check

```bash
node --check src/index.js
node --check src/scenario-catalog.js
```
