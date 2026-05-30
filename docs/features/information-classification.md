# Information Classification

## The Problem: Not All Information Is the Same

When an organization uses AI to answer questions or disclose information, the biggest risk is not that the AI will be wrong. The risk is that the AI will disclose information it should not have disclosed.

A customer asking about a product feature is different from a customer asking about another customer's account. An employee asking about internal policy is different from an external user asking the same question. The same piece of information can be safe to share in one context and a violation in another.

The system cannot decide what to disclose based on whether it *can* retrieve the information. It must first decide what *kind* of information it is dealing with.

## What Information Classification Means

Information classification is the step where the system determines the category of information before deciding whether it can be used or disclosed.

After the system has identified what information is needed to answer a request, and after it has retrieved that information from documents or queries, it must classify that information. The classification tells the system:

- What type of information this is.
- Who is allowed to receive it.
- Which channels are allowed to carry it.
- What verification level is required before it can be disclosed.
- Whether it can be disclosed at all.

## Common Information Classes

The organization defines the classes that apply to its information. These classes reflect business rules, regulatory requirements, and internal policy. Examples of information classes include:

- **Public** – Information that can be shared with anyone, on any channel.
- **General customer information** – Information that applies to all customers but is not specific to one person.
- **Customer-specific information** – Information that belongs to a particular customer account.
- **Employee-only information** – Information that should only be shared with employees.
- **Role-restricted information** – Information that only certain roles within the organization can access.
- **Account-restricted information** – Information tied to a specific account that only the account owner or authorized party can see.
- **Confidential** – Information that is sensitive and has limited disclosure rules.
- **Non-disclosable** – Information that must never be shared through AI-generated responses.
- **Requires verification** – Information that can only be disclosed after the user's identity is confirmed to a required level.
- **Requires escalation** – Information that cannot be disclosed directly and must be handled by a human or another process.

## How Classification Affects Disclosure

Classification is not a label that sits on a document. It is a decision point that controls what happens next.

When the system classifies information, it must answer these questions:

- What class does this information belong to?
- Who is allowed to receive information in this class?
- Which channels are allowed to carry information in this class?
- What verification level is required for this class?
- Is the current user eligible to receive information in this class?

If the user is not eligible, the information must not be disclosed. The system does not partially disclose it. It does not rephrase it to make it seem less restricted. It returns a standard response instead.

## Classification Happens After Retrieval, Before Disclosure

The sequence matters. The system does not classify information before it knows what information is needed. It also does not skip classification and go straight to answering.

The flow is:

1. The request is matched to an approved question or intent.
2. The system retrieves the relevant documents or runs the relevant queries.
3. The system classifies the retrieved information.
4. The system checks whether the current user is eligible to receive that classified information.
5. Only if the classification and eligibility checks pass does the system proceed to answer.

This means that even if the system can retrieve the information, and even if the information is factually correct, it may still be blocked from disclosure because of its classification.

## Why Classification Is Not the Same as Retrieval

A common mistake is to assume that if the system can find the information, it can share it. That is not how Grounded Agentic AI works.

Retrieval answers the question: *Can we find this information?*

Classification answers the question: *Should this information be disclosed to this user?*

These are two different decisions. The system must make both, and the classification decision can override the retrieval decision.

## Practical Example

Consider a customer asking about a refund policy. The system retrieves two documents:

- A public refund policy document.
- A customer-specific refund adjustment record.

Both documents are relevant to the request. But they belong to different information classes. The public refund policy may be classified as "general customer information" and can be shared. The refund adjustment record may be classified as "customer-specific information" and can only be shared with the account owner.

The system must classify each piece of information separately. It cannot treat everything it retrieved as equally disclosable.

## What Happens When Classification Blocks Disclosure

If the information is classified as something the current user cannot receive, the system does not:

- Disclose the information anyway.
- Rephrase the information to bypass the classification.
- Hint that the information exists but cannot be shared.
- Use the information to influence the answer indirectly.

Instead, the system returns a configured standard response. The user does not learn what was withheld or why.

## Why This Matters for Governance

Information classification is one of the gates that every response must pass. It is not a final check on the answer. It is a check on the information itself, before the answer is even drafted.

Without classification, the system would have no way to distinguish between information that is safe to share and information that is restricted. Every retrieval would be a potential leak. Every answer would carry the risk of disclosing something that should have stayed protected.

Classification gives the organization a way to define, in advance, what kind of information can go where, to whom, and under what conditions. The system then enforces those rules consistently, on every request, for every user.
