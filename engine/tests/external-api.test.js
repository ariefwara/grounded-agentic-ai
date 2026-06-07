import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { createExternalApi } from "../src/api/external-api.js";

test("calls the configured external integration endpoint", async (context) => {
  const requests = [];
  const server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      requests.push({ method: request.method, url: request.url, body: JSON.parse(body) });
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ status: "completed", result: "Booking changed." }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => server.close());

  const address = server.address();
  const api = createExternalApi({
    env: { TEST_BOOKING_API_URL: `http://127.0.0.1:${address.port}` },
    integrations: {
      "booking-change": {
        id: "booking-change",
        baseUrlEnv: "TEST_BOOKING_API_URL",
        operation: { method: "POST", path: "/bookings/change" },
        authentication: { type: "none" },
        timeoutMs: 1000,
      },
    },
  });

  const result = await api.callTool({
    actionName: "change flight booking",
    integrationId: "booking-change",
  });

  assert.equal(result.status, "completed");
  assert.deepEqual(requests, [
    {
      method: "POST",
      url: "/bookings/change",
      body: { actionName: "change flight booking" },
    },
  ]);
});

test("does not call an undeclared external integration", async () => {
  const api = createExternalApi();
  const result = await api.callTool({ actionName: "change booking", integrationId: "missing" });

  assert.equal(result.status, "unavailable");
  assert.match(result.result, /not configured/);
});
