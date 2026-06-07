import express from "express";

const port = Number(process.env.PORT || 3002);
const startedAt = new Date();

const externalRecords = [
  {
    id: "ext_ticket_refund_001",
    source: "mock-crm",
    topic: "refund",
    title: "External refund ticket",
    excerpt: "Mock CRM shows one open refund review ticket for the customer.",
  },
  {
    id: "ext_shipping_001",
    source: "mock-logistics",
    topic: "shipping",
    title: "External shipping status",
    excerpt: "Mock logistics reports the package is currently in transit.",
  },
];

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "mock-api",
    uptimeSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
  });
});

app.post("/context", (request, response) => {
  const capability = request.body?.capability || "external-data";
  response.json({
    available: true,
    capability,
    constraints: ["mock-only", "simulation-data"],
  });
});

app.post("/data/search", (request, response) => {
  const topic = String(request.body?.topic || "").toLowerCase();
  const records = externalRecords.filter(
    (record) =>
      !topic ||
      record.topic.includes(topic) ||
      record.title.toLowerCase().includes(topic) ||
      record.excerpt.toLowerCase().includes(topic),
  );

  response.json({
    available: true,
    topic,
    records,
  });
});

app.post("/tools/execute", (request, response) => {
  const actionName = request.body?.actionName || "mock-action";
  response.json({
    status: "completed",
    actionName,
    result: `Mock external tool completed: ${actionName}`,
  });
});

app.use((error, _request, response, _next) => {
  response.status(500).json({
    error: "internal_error",
    message: error instanceof Error ? error.message : "Unexpected error",
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`mock-api listening on ${port}`);
});
