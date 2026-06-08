# Simulation Design

## Purpose

The simulations model complete customer-service conversations for recognizable but fictional US businesses. Each scenario must feel like a conversation with a specific company, not a generic assistant demonstration.

## Design Rules

1. Every scenario selects one profile ID. Web-chat resolves that ID through its local UI registry, while engine resolves the same ID through its local business registry.
2. All customer-facing content is written in English.
3. Brand names are fictional variations inspired by familiar US companies. Current examples include Retail Store, Coffee Catering Business, Real Estate Agency, Beauty Clinic, Parcel Service, Airline, Subscription Service, Pharmacy, Insurance Company, and Bank.
4. Firestore is recursively deleted and seeded every time a scenario starts. The action counter is also reset, so the first created reference is deterministic for that story.
5. Scenarios are ordered by information sensitivity. Public retail guidance comes first, followed by lead-generation and operational support, then account, health, insurance, and banking workflows.
6. Conversations are written independently for each business. They do not share a fixed sequence of definition, lookup, document, identity, verification, action, not-found, and reset.
7. Customer identification follows the business relationship:
   - public shoppers need no identification;
   - catering contacts need a name;
   - prospective home buyers and new clinic clients need a name and callback number;
   - shipment tracking uses a tracking reference instead of a customer identity;
   - airlines use confirmation code and last name;
   - subscription services use account email;
   - pharmacies use patient phone and date of birth;
   - insurers use policy number plus two verification facts;
   - banks use account context plus two knowledge-based verification facts.
8. After a customer or lead is identified, the assistant confirms the context and offers domain-specific examples of what it can do. The customer is not expected to guess the available workflow.
9. Verification strength follows data sensitivity. It is not applied to public information or prospective-customer scheduling.
10. Actions must return a reference that belongs to the seeded story. Ticket numbers are allocated from the Firestore `state/actionCounter` document and stored in `actionRecords`.
11. Customer messages use ordinary customer language. They never select a database, API, tool, or technical execution path; the active profile owns those decisions.
12. The assistant guides the conversation, offers concrete next steps, and avoids redirecting customers to a website or another channel.
13. Customer turns are intentionally short. The assistant asks one focused question at a time and prefers choices or yes/no confirmation when possible.
14. Each scenario seeds several plausible records so a vague request cannot be resolved by assuming the only stored record is the intended one.
15. Retrieval answers use the configured business data, identify ambiguity, and ask for a distinguishing detail instead of guessing.
16. Simulator never owns or transmits complete application profiles. It passes only the selected profile ID at process/application startup.
17. Conversation requests do not contain profile configuration. The engine profile remains fixed for the lifetime of the engine process.
18. Profile IDs represent business deployments, not use cases. For example, scenario `flight-booking` uses profile `flight`.
19. Application profile configuration is YAML and is owned independently by each application.
20. The neutral `generic` profile is the application default; no business use case is selected implicitly.
21. Engine internal-data access is configured by each profile's `data.yaml`; collection names and namespace paths are not selected by customer messages.
22. External APIs are configured as profile-owned YAML capabilities. URLs and secrets are resolved from environment variables at engine startup.
23. Scenario metadata is YAML because it is configuration. Firestore seed data is JSON because it is data.
24. Seed data should include multiple plausible records per domain so the assistant cannot infer intent from a single stored record.
25. Every simulation starts with an uninformed customer greeting. The assistant introduces available help before guiding the customer from the beginning of a service journey.
26. A service journey includes a decision phase before action. The assistant learns the customer's priorities, presents several plausible options, explains meaningful trade-offs, and recommends a fit without forcing a choice.
27. Decision criteria are domain-specific. Flights balance schedule, fare, cabin, and constraints; skincare begins with chat consultation and compares suitability, downtime, and expected pace; operational and sensitive support compares likely causes, remedies, consequences, and urgency.
28. Booking, filing, tracing, disputing, or another action happens only after the customer has enough information to make an informed choice.

## Scenario Matrix

| Order | Business | Conversation goal | Identification | Verification | First action reference |
| --- | --- | --- | --- | --- | --- |
| 1 | Retail Store | Product stock and public return guidance | None | None | `RET-1001` |
| 2 | Coffee Catering Business | Catering pickup request | Contact name | None | `CAT-2101` |
| 3 | Real Estate Agency | Prospective buyer home tour | Name and phone | None | `TOUR-3101` |
| 4 | Beauty Clinic | Agree on and book a consultation slot | Name and mobile | None | `GLOW-4101` |
| 5 | Parcel Service | Track a delayed package and open a trace | Tracking number | None | `TRACE-5101` |
| 6 | Airline | Compare same-day flights and create a new booking | Traveler name and email | None | External API result |
| 7 | Subscription Service | Investigate a duplicate subscription charge | Account email | One billing match | `BILL-7101` |
| 8 | Pharmacy | Check and request a prescription refill | Patient phone | Date of birth | External API result |
| 9 | Insurance Company | Review a hail claim and schedule inspection | Policy number | Date of birth and billing ZIP | `CLM-9101` |
| 10 | Bank | Review a card transaction and create a dispute | Account ID and phone | Billing ZIP and latest transaction | `DSP-10101` |

## Database Reset Contract

At scenario startup, the runner:

1. deletes `simulationDatabases/{scenarioId}` recursively;
2. writes scenario metadata and profile ID;
3. seeds customers, policies, documents, records, and requirement schemas;
4. writes `state/actionCounter` with the scenario prefix and initial number;
5. starts the engine with `FIRESTORE_SIMULATION_ID={scenarioId}`.

This guarantees that the UI conversation, retrieved records, action result, and generated ticket number all refer to the same freshly seeded story.
