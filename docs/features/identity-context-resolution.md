# Identity and Context Resolution

## The Problem: A User Who Is Not Logged In

Most enterprise AI systems assume the user is authenticated. The system knows who the user is, what role they have, and what they are allowed to see. But in practice, users arrive from many channels where login is not required or not practical.

A user might send a question from:

- A web chat widget on a public page.
- An email to a support address.
- A WhatsApp message.
- A support form that does not require login.
- A call center transcript where the agent is typing on behalf of the caller.

In these situations, the system cannot rely on a verified identity. It must work with what it has.

## What the System Needs to Know

The system does not need a confirmed identity to proceed. It needs to know enough about the user to decide what can be answered, what information can be disclosed, and what actions can be executed.

The question is not "Who is this user?" The question is "What can this system safely do for this user right now?"

## Signals Available

When a user is not logged in, the system must infer identity and context from whatever signals are available. These signals can come from the channel itself, from information the user provides, or from previous interactions.

Possible signals include:

- The channel the user came from (web chat, email, WhatsApp, etc.).
- Session metadata such as IP address, device fingerprint, or session token.
- An email address or phone number the user provides.
- A customer ID if the user enters one.
- An account number, order reference, case number, or ticket ID.
- Previous conversation history if the user has interacted before.
- Information the user volunteers, such as their name or relationship to an account.
- A verification state if the user has already passed a verification step.
- Internal routing context, such as which department or agent forwarded the request.

None of these signals alone is a confirmed identity. But together, they can build a picture of who the user might be and what they might be entitled to.

## Confidence States, Not Just Identities

The output of identity and context resolution is not always a confirmed identity. It is a confidence state. The system must be honest about what it knows and what it does not know.

Possible confidence states include:

- **Anonymous**: No identifying signals available at all.
- **Unknown**: Some signals exist, but they do not resolve to a known user or account.
- **Partially identified**: The system has some information about who the user might be, but not enough to confirm.
- **Partially verified**: The user has provided some verification, but not enough for full access.
- **Verified customer**: The user is confirmed as a known customer.
- **Verified employee**: The user is confirmed as an employee.
- **Verified partner**: The user is confirmed as a partner.
- **Ambiguous or high-risk context**: The signals conflict or suggest a situation that requires caution.

Each confidence state carries different implications for what the system can do.

## How Confidence Affects What Happens Next

The confidence state is not just a label. It directly controls what the system can answer, what information can be disclosed, and what actions can be executed.

For example:

- An anonymous user might only receive public information.
- A partially identified user might receive general policy information but not account-specific details.
- A verified customer might receive their own account information.
- A verified employee might receive internal information that customers cannot see.
- An ambiguous or high-risk context might trigger a standard response or route the request to manual review.

The same question from two different confidence states can produce two different answers. The system does not decide based on the question alone. It decides based on the question combined with who the system believes the user is.

## The System Does Not Guess

The system does not pretend to know more than it does. If the confidence state is low, the system does not proceed as if the user were verified. It either returns a standard response, asks for more information, or routes the request to a channel where identity can be confirmed.

This is not a limitation. It is a control. The system is designed to avoid disclosing information or executing actions when the user's identity and context are uncertain.

## Practical Consequence

Identity and context resolution is the first gate in the system. Before the system decides what question was asked, before it retrieves any document, before it checks any policy, it must decide what it knows about the user.

This step exists because the system is not a general chatbot. It is a governance layer. It must know who it is talking to before it decides what it can say.
