import assert from "node:assert/strict";
import test from "node:test";
import { simulationScenarios } from "../src/scenario-catalog.js";

test("defines ten ordered business scenarios", () => {
  assert.equal(simulationScenarios.length, 10);
  assert.equal(simulationScenarios[0].id, "retail-shopping");
  assert.equal(simulationScenarios.at(-1).id, "banking-dispute");
  assert.equal(new Set(simulationScenarios.map((scenario) => scenario.id)).size, 10);
});

test("gives every scenario a profile id, seed, and action counter", () => {
  for (const scenario of simulationScenarios) {
    assert.equal(scenario.firestoreSimulationId, scenario.id);
    assert.ok(scenario.profileId);
    assert.notEqual(scenario.profileId, scenario.id);
    assert.ok(scenario.actionState.prefix);
    assert.ok(Number.isInteger(scenario.actionState.nextNumber));
    assert.ok(scenario.questions.length >= 4);
    assert.match(scenario.questions[0], /^hi[.!]?$/i);
    assert.ok(Array.isArray(scenario.seed.customers));
    assert.ok(scenario.seed.policies.length > 0);
    assert.ok(scenario.seed.documents.length > 0);
    assert.ok(scenario.seed.documents.length >= 3);
    assert.ok(scenario.seed.records.length >= 5);
  }
});

test("keeps profile identity separate from scenario use case", () => {
  const flight = simulationScenarios.find((scenario) => scenario.id === "flight-booking");

  assert.equal(flight.profileId, "flight");
  assert.match(flight.story, /first-time traveler/i);
  assert.match(flight.questions.at(-1), /book it/i);
});

test("orders public support before protected financial support", () => {
  assert.equal(simulationScenarios[0].profileId, "retail");
  assert.equal(simulationScenarios.at(-2).profileId, "insurance");
  assert.equal(simulationScenarios.at(-1).profileId, "banking");
});

test("models option discovery before customer action", () => {
  const decisionLanguage = /best|compare|difference|options?|recommend|fit/i;
  for (const scenario of simulationScenarios) {
    assert.ok(
      scenario.questions.slice(1, -1).some((question) => decisionLanguage.test(question)),
      `${scenario.id} must include a decision-oriented customer turn`,
    );
  }
});

test("keeps Retail assisted purchase factual and option-rich", () => {
  const retail = simulationScenarios.find((scenario) => scenario.id === "retail-shopping");
  const airFryers = retail.seed.records.filter((record) => /air fryer/i.test(record.topic));
  const easyCleaningOptions = airFryers.filter(
    (record) => /\$(?:[0-9]{2}|100)\./.test(record.summary) && /dishwasher-safe/i.test(record.summary),
  );
  const returnEvidence = [...retail.seed.policies, ...retail.seed.documents]
    .map((record) => record.text || record.excerpt || "")
    .join(" ");

  assert.ok(airFryers.length >= 10);
  assert.ok(easyCleaningOptions.length >= 3);
  assert.doesNotMatch(JSON.stringify(airFryers), /best fit|recommend/i);
  assert.ok(airFryers.every((record) => record.price && record.capacityQuarts && record.powerWatts));
  assert.ok(airFryers.every((record) => record.dimensionsInches && record.warrantyYears && record.store));
  assert.match(returnEvidence, /exchanged(?: for another model)? within 30 days/i);
  assert.match(returnEvidence, /clean, undamaged/i);
  assert.deepEqual(
    retail.seed.policies.map((policy) => policy.id).sort(),
    [
      "exchange-price-difference",
      "inventory-reservation",
      "opened-product-condition",
      "pickup-purchase",
      "product-exchange",
      "warranty-guidance",
    ],
  );
  assert.ok(retail.seed.policies.every((policy) => policy.topic && policy.title && policy.text));
  assert.equal(retail.actionState.prefix, "ORD");
  assert.match(retail.questions.at(-1), /place the pickup purchase/i);
});

test("keeps Insurance hail guidance complete and safety-first", () => {
  const insurance = simulationScenarios.find((scenario) => scenario.id === "insurance-claim");
  const claim = insurance.seed.records.find((record) => record.id === "claim-SB-CLM-221");
  const guidance = [claim, ...insurance.seed.documents, ...insurance.seed.policies]
    .map((record) => record.summary || record.excerpt || record.text || "")
    .join(" ");

  assert.match(guidance, /stay off the roof|never climb onto a damaged roof/i);
  assert.match(guidance, /photograph visible damage/i);
  assert.match(guidance, /temporary mitigation|temporary measures/i);
  assert.match(guidance, /retain .*receipts|retain itemized receipts/i);
  assert.match(guidance, /avoid signing .*repair contract|avoid signing repair contracts/i);
  assert.match(guidance, /when the roof is not leaking|without a leak/i);
  assert.match(guidance, /active leak|if a leak/i);
});

test("keeps Bank card-lock and transaction-state guidance accurate", () => {
  const banking = simulationScenarios.find((scenario) => scenario.id === "banking-dispute");
  const guidance = [...banking.seed.documents, ...banking.seed.policies]
    .map((record) => record.excerpt || record.text || "")
    .join(" ");

  assert.match(guidance, /lock(?:ing)? .*prevent(?:s)? new .*authorizations/i);
  assert.match(guidance, /does not guarantee .*pending transaction/i);
  assert.match(guidance, /pending transaction .*post or drop off/i);
  assert.match(guidance, /completed .*dispute/i);
  assert.match(guidance, /declined transaction did not post/i);
});
