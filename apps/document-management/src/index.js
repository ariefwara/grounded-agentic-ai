import express from "express";

const port = Number(process.env.PORT || 3001);
const app = express();
const documents = [
  {
    id: "refund-policy",
    title: "Refund Policy",
    classification: "general_customer_information",
    status: "approved",
    body: "Refund eligibility depends on the approved refund policy for the purchase.",
  },
];

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "document-management",
    documentCount: documents.length,
  });
});

app.get("/documents", (_request, response) => {
  response.json({ documents });
});

app.post("/documents", (request, response) => {
  const document = {
    id: request.body.id ?? crypto.randomUUID(),
    title: request.body.title ?? "Untitled document",
    classification: request.body.classification ?? "unclassified",
    status: request.body.status ?? "draft",
    body: request.body.body ?? "",
  };

  documents.push(document);
  response.status(201).json({ document });
});

app.get("/documents/:id", (request, response) => {
  const document = documents.find((item) => item.id === request.params.id);
  if (!document) {
    response.status(404).json({ error: "document_not_found" });
    return;
  }

  response.json({ document });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`document-management listening on ${port}`);
});
