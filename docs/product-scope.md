# Product Scope

Grounded Agentic AI controls the full journey of a user request. It identifies user context, matches the request to approved questions or intents, retrieves relevant documents or runs relevant queries, classifies information, checks eligibility, controls actions, produces an approved answer, and only responds when every required gate passes.

The system is not a general chatbot. It is a governance layer for AI-generated business communication and AI-assisted action.

## Core Scope

Grounded Agentic AI decides:

- What questions AI is allowed to answer.
- What information AI is allowed to disclose.
- What documents or data AI is allowed to retrieve or query.
- Which users are eligible to receive that information.
- Which predefined actions AI is allowed to execute.
- Which response style AI is allowed to use.
- Whether each response or intermediate output is allowed to continue.
- Whether the final answer is safe to send.

Governance and gate checks apply to every response step, not only the final answer.

## 1. User Sends a Question or Request

The user can come from any channel:

- Web chat.
- Email.
- WhatsApp or messaging channel.
- Application UI.
- Support form.
- Call center transcript.
- Internal chat.
- Public page.

The user does not need to be logged in.

The input can be:

- A question.
- An information request.
- An action request.
- An ambiguous sentence.
- A combination of question, information request, and action request.

## 2. System Resolves Identity and Context

Because the user may not be logged in, the system must infer identity and context from available signals.

Signals may include:

- Channel.
- Session metadata.
- Email address.
- Phone number.
- Device/session token.
- Customer ID if provided.
- Account, order, case, or ticket reference.
- Previous conversation context.
- User-provided information.
- Verification state.
- Internal routing context.

The output of this step is not always a confirmed identity. It can be a confidence state.

Possible confidence states:

- Anonymous.
- Unknown.
- Partially identified.
- Partially verified.
- Verified customer.
- Verified employee.
- Verified partner.
- Ambiguous or high-risk context.

This confidence state affects what the system can answer, what information can be disclosed, and what action can be executed.

## 3. System Understands the Request Meaning

The system must understand the meaning of the request, not only match keywords.

It should determine:

- What the user is asking.
- What information the user wants.
- Whether the user is asking for an action.
- Whether the request is ambiguous.
- Whether the request has the same meaning as a predefined question.
- Whether the request changes meaning by asking for a commitment, exception, or private information.

## 4. System Matches the Request to a Predefined Question or Intent

The business can define canonical questions and approved intents.

The user does not need to use the exact wording. If the meaning is the same, the system may treat it as the same question.

Example:

Canonical question:

> Refund eligibility

Equivalent user wording:

- Can I get a refund?
- Can I get my money back?
- If I cancel, will the payment be returned?
- Am I eligible for a refund?

These can map to the same canonical question if the business meaning is equivalent.

The system must also detect when the meaning changes.

Example:

- Am I eligible for a refund?
- Can you guarantee my refund today?

These are not the same. The second request asks for a commitment, so it must be evaluated differently.

## 5. If the Request Does Not Match, Return a Standard Response

If the request does not match an approved question or intent, the AI must not improvise.

The system must:

- Not answer freely.
- Not search for a workaround.
- Not invent policy.
- Not answer from general model knowledge.
- Not create a new denial wording outside configuration.
- Return the configured standard response.

## 6. If the Request Matches, Determine the Request Type

After matching, the system determines the type of work required.

Possible request types:

- Answer only.
- Information disclosure.
- Action request.
- Answer plus information.
- Information plus action.
- Verification required.
- Manual review required.
- Not allowed.

This matters because a valid question may still require restricted information or a controlled action.

## 7. Retrieve Relevant Documents or Run Relevant Queries

If the request is allowed to proceed, the system must retrieve the documents or data needed to answer it.

Retrieval and query are also governed operations. The system must not retrieve everything just because the user asked.

The system should determine:

- Which approved documents are relevant.
- Which database query is relevant.
- Which tool is allowed for this request.
- Whether the user context allows this retrieval or query.
- Whether the retrieved information is classified.
- Whether the retrieved information can be used in the current channel.

Examples of allowed retrieval/query sources can include:

- Approved policy documents.
- Approved product documentation.
- Approved support playbooks.
- Account-specific records.
- Order, transaction, case, or ticket records.
- Internal SOPs.
- Incident status documents.

The system must retrieve or query only what is necessary for the matched question or intent.

## 8. Classify the Information

After identifying or retrieving the required information, the system must classify it.

Information classes may include:

- Public.
- General customer information.
- Customer-specific information.
- Employee-only information.
- Role-restricted information.
- Account-restricted information.
- Confidential.
- Non-disclosable.
- Requires verification.
- Requires escalation.

The system must determine:

- What information is needed.
- What class the information belongs to.
- Who is allowed to receive it.
- Which channel is allowed.
- What verification level is required.
- Whether the current user is eligible.

## 9. Check User Eligibility for Information

The system must check whether the current user can receive the requested or retrieved information.

Eligibility can depend on:

- Identity confidence.
- Verification state.
- Role.
- Account ownership.
- Customer status.
- Employee status.
- Partner status.
- Channel.
- Relationship to the requested object.
- Policy condition.
- Approval state.

If the user is not eligible:

- The information must not be disclosed.
- The system must use a standard response.
- The system may ask for verification or route to another channel if configured.

## 10. Check Action Eligibility If an Action Is Requested

If the request includes an action, the action must be predefined.

The system may only execute an action if:

- The request maps to an approved intent.
- The action is predefined.
- The action matches its configured classification.
- The user is eligible.
- The required context is available.
- The policy allows the action.
- The channel allows the action.
- The action has an audit path.

The system may execute actions, including API calls, if the action is allowed by its classification and all required eligibility checks pass. The system must not execute arbitrary user-requested actions outside the configured classification boundary.

If the action is not allowed:

- Do not execute the action.
- Do not pretend the action was executed.
- Do not promise that the action will succeed.
- Return the configured standard response or limited answer.

## 11. Select the Approved or Default Answer

If the request can be answered, the system must select the approved answer boundary.

This can be:

- Exact default answer.
- Approved answer template.
- Answer policy.
- Channel-specific answer.
- Audience-specific answer.
- Fallback answer.
- Escalation answer.

The AI must not create an answer from zero without a boundary.

## 12. Adapt the Answer Wording

The final wording does not need to match the approved answer word-for-word.

The AI may adapt wording if:

- The meaning remains the same as the approved/default answer.
- The style is correct.
- No unsupported claim is added.
- No required condition is removed.
- No policy meaning is changed.
- No new commitment is created.
- No restricted information is disclosed.

This is semantic answer equivalence.

## 13. Gate Every Response and Intermediate Output

Governance is not only a final-output check.

The system must gate every important response step:

- Scope decision.
- Retrieval decision.
- Query decision.
- Retrieved information use.
- Draft answer.
- Tool or action call.
- Standard response selection.
- Retry output.
- Final answer.

Intermediate outputs can also leak information or cause wrong actions. They must be evaluated before they are passed forward, shown to a user, used by another agent step, or used to execute an action.

## 14. Evaluate the Answer Before Sending

Before an answer is sent, the system checks:

- Whether the question was allowed.
- Whether the retrieved documents or query results were allowed.
- Whether the answer is semantically equivalent to the approved/default answer.
- Whether the style is compliant.
- Whether all claims are supported.
- Whether information classification rules are respected.
- Whether user eligibility rules are respected.
- Whether no unauthorized action or commitment appears in the answer.

## 15. Drop, Retry, or Standard Response

If an answer or intermediate response fails a gate:

- Drop the response.
- Do not send it to the user.
- Do not use it as context for later steps unless explicitly marked as failed.
- Provide failure feedback to the generator if retry is allowed.
- Retry within the configured limit.
- If it still fails, return a configured standard response.

## 16. Send the Answer Only If All Gates Pass

The answer may be sent only if:

- The question is allowed.
- The retrieval or query is allowed.
- The information is allowed for this user.
- The user is eligible.
- The action is allowed if one exists.
- The action classification is allowed if one exists.
- The action eligibility passes if one exists.
- The answer is semantically equivalent to the approved answer.
- The style is compliant.
- The disclosure is safe.
- All required gates pass.

## 17. Audit Every Decision

Every important decision must be auditable.

The audit should capture:

- Original user request.
- Channel and context signals.
- Identity/context confidence.
- Matched canonical question or intent.
- Match confidence and reason.
- Request type.
- Retrieval or query decision.
- Documents or data sources used.
- Information classification.
- User eligibility result.
- Action requested, if any.
- Action eligibility result.
- Approved/default answer used.
- Draft answers.
- Gate results for intermediate outputs.
- Semantic answer equivalence result.
- Style check result.
- Disclosure check result.
- Retry/drop history.
- Standard response used, if any.
- Final decision.

Final decision can be:

- Sent.
- Blocked.
- Standard response.
- Verification required.
- Manual review required.
- Action executed.
- Action denied.

## Out of Scope

Grounded Agentic AI is not:

- A freeform chatbot.
- A system that answers anything from model knowledge.
- A system that retrieves any document without scope checks.
- A system that runs arbitrary queries.
- A system that executes arbitrary actions.
- A system that only checks the final response.

## Minimal First Version

The first version should include:

1. Identity and context confidence.
2. Semantic match to predefined questions.
3. Standard response for unmatched questions.
4. Relevant document retrieval or query.
5. Information classification.
6. User eligibility check.
7. Predefined action eligibility if action exists.
8. Approved/default answer mapping.
9. Semantic answer equivalence check.
10. Style check.
11. Gate on intermediate and final responses.
12. Drop, retry, or standard response.
13. Audit trail.
