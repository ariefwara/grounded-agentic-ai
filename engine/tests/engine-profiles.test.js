import assert from "node:assert/strict";
import test from "node:test";
import { listEngineProfileIds, loadEngineProfile } from "../src/config/engine-profiles.js";

test("defines the ten engine profiles used by simulations", () => {
  assert.deepEqual(listEngineProfileIds(), [
    "banking",
    "beauty",
    "coffee",
    "flight",
    "generic",
    "insurance",
    "parcel",
    "pharmacy",
    "real-estate",
    "retail",
    "subscription",
  ]);
});

test("keeps engine behavior out of the UI profile contract", () => {
  const profile = loadEngineProfile("flight");

  assert.equal(profile.action.path, "external_api");
  assert.equal(profile.dataSource, "internal");
  assert.equal(profile.data.adapter, "firestore");
  assert.equal(profile.data.collections.records, "records");
  assert.equal(profile.externalIntegrations["flight-booking"].baseUrlEnv, "FLIGHT_API_URL");
  assert.equal("theme" in profile, false);
  assert.equal("assistantName" in profile, false);
});

test("configures a deterministic Bank identification question", () => {
  const profile = loadEngineProfile("banking");

  assert.match(profile.identificationQuestion, /account ID or phone number/i);
});

test("provides a neutral generic default profile", () => {
  const profile = loadEngineProfile("generic");

  assert.equal(profile.id, "generic");
  assert.equal(profile.verification.required, false);
  assert.equal(profile.action, undefined);
});

test("rejects an unknown engine profile", () => {
  assert.throws(() => loadEngineProfile("unknown"), /Unknown engine profile/);
});
