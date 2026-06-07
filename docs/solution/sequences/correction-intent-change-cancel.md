# Correction, Intent Change, and Cancel

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Engine
    participant Gemini
    participant Session
    participant DB
    participant API
    participant Arize

    User->>Engine: Correct detail, change topic, or cancel
    Engine->>Session: Load pending state and collected slots
    Session-->>Engine: Active conversation state

    alt Message matches direct cancel rule
        Engine->>Session: Clear pending state and collected slots
        Engine->>Session: Save cancellation turn
        Engine-->>User: Confirm cancellation
    else Pending state exists
        Engine->>Gemini: Classify continue, correction, intent change, or cancel
        Gemini-->>Engine: Control decision, intent, and entities
        alt Intent change
            Engine->>Session: Clear old pending state
            Engine->>Engine: Continue with new interpreted intent
        else Correction
            Engine->>Engine: Mark message as answer to pending and merge entities
            Engine->>Engine: Continue through active pending handler
        else Continue
            Engine->>Engine: Continue through active pending handler
        else Cancel returned by Gemini
            Engine->>Engine: Convert to cancel intent
            Engine->>Engine: Continue current dispatch after the earlier cancel check
        end
    else No pending state
        Engine->>Engine: Process as normal new request
    end
```

Cancellation has a deterministic route for messages beginning with supported cancel, reset, or stop commands. It clears the pending state and all collected slots, but it does not clear customer context, verification status, or prior turns.

When a pending state exists, Gemini classifies the message as continuation, correction, intent change, or cancel. An intent change clears the old pending state before dispatching the new intent.

Correction currently merges extracted entities into the interpretation and marks the message as an answer to the pending flow. There is no separate Arize evaluation for conversation-control decisions in the current implementation.

The direct cancel rule is the reliable cancellation path. A cancel decision returned only by the later Gemini control inspection is converted to a cancel intent after the engine's initial cancel branch has already run. The current turn therefore continues through the remaining dispatch logic instead of immediately clearing state. This is a current runtime limitation, not the intended final behavior.
