# Action Eligibility

## The Problem: Not Every Action Request Should Be Executed

When a user asks an AI system to perform an action—such as processing a refund, updating an account, or sending a notification—the system faces a decision. The action may be technically possible. The AI may know how to call the relevant API. But that does not mean the action should be executed.

A normal chatbot or automation tool might execute any action it has access to, as long as the user asks for it. For a business that needs control over what actions AI can take, this is not acceptable. The wrong action, or the right action for the wrong user, can cause financial loss, compliance violations, or customer harm.

## What Action Eligibility Means

Action eligibility is the process of determining whether a predefined action—including an API call—is allowed for a specific user request, in a specific context, before the system executes it.

The system does not decide whether an action is possible. It decides whether the action is permitted. This is a governance decision, not a technical capability check.

## When Action Eligibility Applies

Action eligibility is checked when a user request includes an action. The request may be:

- A pure action request ("Cancel my order").
- A question combined with an action ("Can I get a refund, and if so, process it?").
- An information request that implies an action ("Tell me my balance and transfer it").

The system must detect that an action is being requested, even if the wording is indirect.

## What Must Be True for an Action to Be Eligible

An action may only be executed if all of the following conditions are met:

### 1. The Request Maps to an Approved Intent

The user's request must match a predefined, approved intent. If the request does not match, the system cannot execute any action, even if the action would otherwise be allowed. The system must not improvise or invent a new action path.

### 2. The Action Is Predefined

The system may only execute actions that have been explicitly defined and configured. There is no general "execute whatever the user asks" capability. Each action must be registered with its parameters, expected behavior, and boundaries.

### 3. The Action Matches Its Configured Classification

Actions are classified according to their type, risk level, and required controls. The system must verify that the requested action matches its configured classification. For example, a "read balance" action and a "transfer funds" action belong to different classifications and have different eligibility rules.

### 4. The User Is Eligible

The system checks whether the current user is allowed to request this action. Eligibility depends on:

- Identity confidence (is the user known, partially identified, or verified?).
- Role (customer, employee, partner).
- Account ownership (does the user own or have authority over the target account?).
- Relationship to the object (is this the user's own order or someone else's?).
- Verification state (has the user passed required verification?).

If the user is not eligible, the action must not be executed.

### 5. The Required Context Is Available

Some actions require specific context to be present and valid. For example, a refund action may require an order number, a reason code, and a valid payment method. If the required context is missing or invalid, the action is not eligible.

### 6. The Policy Allows the Action

Business policies may restrict actions based on conditions such as time, amount, frequency, or status. The system must evaluate these policies before allowing the action. For example, a refund policy may allow refunds only within 30 days of purchase.

### 7. The Channel Allows the Action

Not all actions are allowed on all channels. A high-risk action such as a password reset may be allowed on a verified web session but not on an unauthenticated chat channel. The system checks whether the current channel is permitted for this action.

### 8. The Action Has an Audit Path

Every action must be auditable. The system must be able to record what action was requested, by whom, in what context, whether it was allowed or denied, and what the outcome was. If an action cannot be audited, it is not eligible.

## What Happens When an Action Is Not Eligible

If any eligibility check fails, the system must:

- **Not execute the action.** The API call must not be made.
- **Not pretend the action was executed.** The system must not tell the user the action succeeded when it did not.
- **Not promise that the action will succeed.** The system must not create an expectation that the action will be completed later.
- **Return the configured standard response or limited answer.** The system may explain that the action cannot be performed, but only within the boundaries of the approved response.

## Why Action Eligibility Is Not a Final-Output Check

Action eligibility is checked before the action is executed, not after. This is important because executing an action and then checking whether it was allowed is too late. The action may have already changed a record, triggered a notification, or caused a financial transaction.

The eligibility check happens at the point where the system decides whether to call the action. If the check fails, the action is never initiated.

## Practical Example

Consider a user who asks: "Cancel my subscription."

The system must check:

- Does this request match an approved intent for subscription cancellation?
- Is there a predefined "cancel subscription" action?
- Is the user's identity confidence sufficient for this action?
- Does the user own the subscription they want to cancel?
- Is the cancellation policy satisfied (e.g., no active commitments)?
- Is the current channel allowed for cancellations?
- Can the action be audited?

Only if all checks pass can the system proceed to execute the cancellation API call. If any check fails, the action is denied, and the system returns a standard response.

## The Business Value

Action eligibility gives the organization control over what AI can do, not just what AI can say. It prevents unauthorized actions, protects against misuse, and ensures that every action is traceable to a policy decision. The system does not act because it can. It acts only because it is allowed to.
