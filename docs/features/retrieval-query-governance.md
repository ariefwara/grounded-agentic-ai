# Retrieval and Query Governance

## The Problem: Not All Information Should Be Retrievable

When a user asks a question, a typical AI system retrieves whatever documents or data seem relevant. It searches broadly, pulls information from multiple sources, and assembles an answer. This works well for general knowledge questions, but it creates a serious problem for business communication.

Consider what happens when a customer asks about a refund policy. A normal system might retrieve the refund policy document, but it might also pull internal notes about exceptions, employee guidelines about handling difficult cases, or historical data about other customers' refunds. The system retrieves everything that looks related, regardless of whether that information should be shared with this particular customer.

This is not a technical failure. The system is doing exactly what it was built to do: find relevant information. The problem is that relevance alone is not a sufficient criterion for retrieval in a business context.

## What Retrieval and Query Governance Means

Retrieval and query governance is the principle that the system must retrieve documents or run queries only when they are allowed for the specific request and user context. The system does not retrieve everything that might be relevant. It retrieves only what is permitted.

This is a fundamental shift from how most AI systems work. Instead of starting with "what information exists that could answer this question?", the system starts with "what information is this user allowed to receive for this question?"

## How It Works in Practice

The system follows a decision chain before any retrieval or query happens:

**Step 1: Match the request first.** Before the system even considers what documents to retrieve, it must match the user's request to a predefined question or intent. If the request does not match an approved question, the system returns a standard response. No retrieval happens at all.

**Step 2: Determine the request type.** After matching, the system identifies what kind of work is needed. Is this a simple answer, an information disclosure, or an action request? The request type affects what retrieval is appropriate.

**Step 3: Identify what is needed.** The system determines which approved documents are relevant, which database query is relevant, and which tool is allowed for this specific request. This is not a general search. It is a targeted identification based on the matched question.

**Step 4: Check user context.** The system evaluates whether the current user context allows this retrieval or query. A verified customer may be allowed to retrieve their own account records. An anonymous user may only be allowed to retrieve public policy documents. An employee may have access to internal SOPs that a customer cannot see.

**Step 5: Retrieve only what is necessary.** The system retrieves or queries only the information needed for the matched question or intent. It does not pull extra documents, related records, or supplementary information that was not requested.

## What Counts as an Allowed Retrieval Source

The system does not retrieve from any available source. Retrieval is limited to approved sources that have been configured for the business context. These may include:

- Approved policy documents
- Approved product documentation
- Approved support playbooks
- Account-specific records
- Order, transaction, case, or ticket records
- Internal SOPs
- Incident status documents

Each source is evaluated for whether it is appropriate for the matched request and the current user.

## Why This Matters

Retrieval and query governance prevents several common problems:

**Information leakage.** A customer asking about a standard policy should not receive internal notes about exceptions or employee guidelines. The system retrieves only the policy document, not the internal commentary.

**Context confusion.** A user asking about their own account should receive their account records, not another customer's records. The system checks account ownership before running the query.

**Scope creep.** A user asking about refund eligibility should not trigger a retrieval of pricing documents, product roadmaps, or internal strategy documents. The system retrieves only what is necessary for the matched question.

**Unauthorized access.** An anonymous user should not be able to retrieve customer-specific records. The system checks user eligibility before allowing any retrieval or query.

## The Gate Check

Retrieval and query are governed operations, not free searches. The system applies a gate check before any retrieval or query is executed:

- Is the request matched to an approved question?
- Is the retrieval source approved for this question?
- Is the user context allowed for this retrieval?
- Is the information classification compatible with this user?
- Is the channel appropriate for this information?

If any gate fails, the retrieval or query does not happen. The system does not partially retrieve and then filter. It does not retrieve first and check later. The governance applies before the operation.

## The Practical Consequence

For the business, this means control over what information the AI can access and disclose. The organization defines which documents are retrievable, for which questions, and for which users. The system enforces those boundaries at the retrieval stage, not only at the response stage.

For the user, this means they receive only the information they are entitled to, based on their identity, context, and the question they asked. They do not receive information that was retrieved incidentally or that belongs to a different context.

For the system, this means retrieval is not a general capability. It is a governed operation with clear boundaries, eligibility checks, and audit trails. Every retrieval decision is recorded, including what was retrieved, why it was retrieved, and whether the user was allowed to receive it.

## Summary

Retrieval and query governance ensures that the system retrieves documents or runs queries only when they are allowed for the matched request and user context. It is not about finding all relevant information. It is about finding only the permitted information. This prevents information leakage, unauthorized access, and scope creep, while giving the organization clear control over what the AI can access and disclose.
