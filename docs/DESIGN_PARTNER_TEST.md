# v0.1 Design-Partner Test

Goal: determine whether a qualified builder can install OASG, represent one real policy using synthetic or testnet data, reproduce three decisions, and identify the next integration requirement.

## Participant

Use a builder who currently works with an agent wallet, x402 payment flow, Safe treasury, or payment-policy system. No production funds or private keys are needed.

## 30-minute session

1. Install the tagged release and run the three bundled outcomes.
2. Map one participant policy using a synthetic counterparty and testnet asset.
3. Normalize one x402 v2 or Safe example.
4. Produce allow, approval-required, and block decisions.
5. Export one evidence package and independently rerun it.
6. Record missing fields, unclear language, unsafe assumptions, and desired enforcement point.

## Success criteria

- install and first decision in 5 minutes or less;
- participant maps a policy without source changes in 15 minutes or less;
- all three expected outcomes match;
- repeated inputs produce the same decision and package IDs;
- participant can explain the evidence record without assistance;
- participant identifies a credible pilot, integration, or reason not to proceed.

## Evidence to collect

- participant role and project category;
- release commit and runtime version;
- time to install and time to first custom policy;
- anonymized policy shape and adapter used;
- expected and actual reason codes;
- usability rating from 1 to 5;
- security objection or trust-boundary concern;
- follow-up decision: pilot, contribute, revisit, or no fit.

## Safety

Use synthetic or testnet facts. Do not collect keys, seed phrases, production credentials, customer data, undisclosed vulnerabilities, or live transaction authority.
