# Approved Answer Boundary

## The Problem: AI Must Not Create Answers From Nothing

When a customer asks a question, a normal chatbot can generate any answer it wants. It can pull information from its training data, combine sentences in new ways, and produce a response that sounds correct but has never been reviewed by the business.

For a business that needs to control what is communicated, this is unacceptable. An AI that creates answers freely can:

- Make promises the business cannot keep.
- Disclose information that should remain private.
- Give incorrect policy interpretations.
- Use a tone or style that does not match the brand.
- Create legal or compliance risk with every response.

The business needs a way to say: *the AI may only answer within this boundary.*

## What the Approved Answer Boundary Does

The approved answer boundary is the mechanism that determines which answer the system is allowed to use before any wording is generated.

The system does not start from a blank page. It starts from a predefined answer, answer template, answer policy, or fallback boundary. The AI may adapt the wording, but it may not leave the boundary.

## How the Boundary Is Selected

The system selects the approved answer boundary based on several factors that have already been determined earlier in the request journey:

**1. The matched question or intent.**  
If the user's request matches a predefined canonical question, the system knows which approved answer or answer template corresponds to that question.

**2. The user context and eligibility.**  
The same question may have different approved answers depending on who is asking. A verified customer may receive a detailed answer. An anonymous user may receive a general answer. An ineligible user may receive a standard response.

**3. The channel.**  
The approved answer may differ by channel. A web chat answer may be shorter than an email answer. A WhatsApp answer may follow a different template.

**4. The request type.**  
If the request is only an information request, the answer boundary is one thing. If the request includes an action, the answer boundary may include confirmation of the action or a standard response about action eligibility.

**5. The information classification.**  
If the retrieved information is classified as customer-specific or confidential, the answer boundary may restrict what can be included in the response.

## What the Boundary Can Be

The approved answer boundary can take several forms:

- **Exact default answer.** A fixed response that must be used word-for-word or adapted only within strict limits.
- **Approved answer template.** A structured response with placeholders for specific information, such as account details or policy references.
- **Answer policy.** A set of rules that define what the answer must contain, what it must not contain, and what conditions apply.
- **Channel-specific answer.** A version of the answer tailored to the communication channel.
- **Audience-specific answer.** A version of the answer tailored to the user's role, verification level, or relationship to the business.
- **Fallback answer.** A standard response used when the system cannot determine the correct answer or when a gate fails.
- **Escalation answer.** A response that directs the user to a human agent or another channel.

## The AI May Adapt Wording, But Not Meaning

Once the boundary is selected, the AI may adapt the wording. This is not free generation. It is controlled rewording within the boundary.

The AI may:

- Rephrase sentences while keeping the same meaning.
- Adjust tone to match the channel or audience.
- Insert retrieved information into template placeholders.

The AI may not:

- Add claims that are not in the approved answer.
- Remove required conditions or disclaimers.
- Change the policy meaning.
- Create new commitments.
- Disclose restricted information.
- Change the answer to something that sounds different but means the same thing in a misleading way.

This is called semantic answer equivalence. The final answer must mean the same thing as the approved answer, even if the words are different.

## Why This Matters

Without an approved answer boundary, the AI is a freeform generator. It can say anything. The business cannot guarantee what will be communicated.

With an approved answer boundary, the business can:

- Review and approve every answer before it is used.
- Ensure consistent communication across channels and audiences.
- Control what information is disclosed and to whom.
- Maintain compliance with legal, regulatory, and policy requirements.
- Audit every response back to a known, approved source.

## Practical Consequence

The approved answer boundary is not about limiting what the AI can do. It is about ensuring the AI only does what the business has already decided is acceptable.

The system does not answer because it can. It answers because the business has defined a boundary, the request fits within that boundary, and the answer stays within that boundary.
