# Information Eligibility

## The Problem: Not Everyone Should Receive Every Answer

An organization may have the right answer to a question. It may have the correct document. It may even have the right policy. But that does not mean every person who asks should receive that information.

Consider a customer asking about another customer's order. Consider an employee asking about payroll data for a department they do not manage. Consider a partner asking about internal pricing models. In each case, the information exists, the question is reasonable, but the user should not receive the answer.

A normal chatbot or search system does not distinguish between "this information exists" and "this user is allowed to receive this information." It retrieves and responds based on relevance alone. For business communication, relevance is not enough. Eligibility is required.

## What Information Eligibility Means

Information eligibility is the decision the system makes about whether the current user can receive the requested or retrieved information. It is not a question of whether the information is correct or whether the system knows the answer. It is a question of whether the user has the right to receive it.

The system does not ask "Can we answer this?" It asks "Is this user allowed to receive this answer?"

## What Eligibility Depends On

The system determines eligibility by evaluating multiple factors together. No single factor alone decides the outcome.

**Identity confidence.** The system may not know exactly who the user is. The user may be anonymous, partially identified, or fully verified. The level of confidence affects what information can be disclosed. A verified customer may be eligible for account-specific information. An anonymous user may only receive public information.

**Verification state.** Even if the system knows who the user claims to be, it may need additional verification before disclosing certain information. A user asking about a sensitive transaction may need to confirm their identity through a separate step.

**Role and relationship.** The user's role determines what they are allowed to see. A customer can see their own order details but not another customer's. An employee can see internal documentation for their department but not for restricted projects. A partner can see shared product information but not internal pricing strategy.

**Account ownership.** Some information is tied to a specific account, order, case, or ticket. The user must be the owner or an authorized party for that object. The system checks whether the user has a legitimate relationship to the requested information.

**Channel.** The channel through which the user is communicating can affect eligibility. Information that is safe to share in a verified portal may not be safe to share over email or an unauthenticated web chat. The system considers the channel's security and verification capabilities.

**Policy conditions.** The organization may define additional rules about who can receive certain information. These can include approval requirements, time restrictions, or escalation rules that must be satisfied before disclosure.

## When Eligibility Is Checked

Eligibility is not checked only at the end of the process. It is checked at multiple points.

First, when the system determines what information is needed to answer the request. The system must know what class of information is required before it can check whether the user is eligible.

Second, when the system retrieves or queries for that information. Retrieval itself is governed. The system should not retrieve information that the user is not eligible to receive, even if the system does not disclose it.

Third, before the answer is formed. The system must confirm that the user is eligible for the specific information that will appear in the response.

Fourth, before the answer is sent. Even if eligibility was confirmed earlier, the final answer must be checked again to ensure no restricted information slipped through.

## What Happens When the User Is Not Eligible

If the user is not eligible to receive the requested or retrieved information, the system must not disclose that information. It cannot give a partial answer that hints at the restricted content. It cannot say "I have that information but I cannot tell you." It must use a configured standard response.

The system may be configured to ask for verification if the user is partially identified. It may route the user to another channel where eligibility can be confirmed. But it must not disclose information that the user is not eligible to receive.

## Why This Matters for Business Communication

Information eligibility prevents accidental disclosure of sensitive data. It ensures that customers only see their own information. It protects internal documents from being shared with external parties. It enforces role-based access controls even when the user is communicating through natural language.

Without eligibility checks, a system that retrieves the right information can still produce the wrong outcome. The information may be accurate, relevant, and well-written, but if the user should not receive it, the answer is a failure.

Eligibility is the gate that separates "the system knows the answer" from "the user is allowed to receive the answer." Both conditions must be true before a response can be sent.
