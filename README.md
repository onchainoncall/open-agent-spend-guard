# Open Agent Spend Guard

Deterministic policy decisions and portable evidence for agent-initiated onchain payments.

Open Agent Spend Guard (OASG) is a small, provider-neutral TypeScript library and CLI. It turns a versioned policy plus a normalized payment request into one of three outcomes:

- `allow`
- `block`
- `approval_required`

Each decision includes a stable reason code, the matching rule path, SHA-256 hashes of the exact policy and request, and a deterministic decision ID. A complete evidence package can carry the policy, request, and decision together for replay and review.

This is an unaudited v0.1 reference implementation. It does not hold keys, sign transactions, settle payments, or enforce wallet behavior.

## Why this exists

Wallet and payment providers can enforce local controls, but teams still need a portable answer to four questions:

1. Which policy version governed this request?
2. Why was it allowed, blocked, or sent for approval?
3. Which normalized chain, asset, amount, counterparty, and budget facts were evaluated?
4. Can another operator reproduce the result without production funds?

OASG addresses that evidence gap without replacing provider controls.

## v0.1 scope

- Four JSON Schemas: policy, request, decision, and evidence package
- Exact integer arithmetic with `bigint`; no floating-point token amounts
- Chain, asset, counterparty, purpose, transaction-cap, approval, and daily-budget rules
- x402 v2 `PaymentRequired` normalization for the `exact` scheme
- Read-only Safe Transaction Service normalization for native `CALL` transfers
- CLI commands for normalization, validation, evaluation, evidence, and hashing
- Fail-closed handling for x402 scheme mismatches, Safe delegate calls, calldata, and gas refunds
- 102 deterministic, boundary, malformed-input, adapter-contract, CLI, golden-vector, and adversarial tests
- Node.js 20+ support with public GitHub Actions checks across Node.js 20, 22, and 24

## Install

From the tagged public source release:

```bash
npm install github:onchainoncall/open-agent-spend-guard#v0.1.2
```

Or install the hosted release artifact directly:

```bash
npm install https://onchainoncall.com/downloads/open-agent-spend-guard-0.1.2.tgz
```

Published checksums are available at [onchainoncall.com/downloads/open-agent-spend-guard-v0.1.2-sha256.txt](https://onchainoncall.com/downloads/open-agent-spend-guard-v0.1.2-sha256.txt).

For local development:

```bash
git clone https://github.com/onchainoncall/open-agent-spend-guard.git
cd open-agent-spend-guard
npm ci
npm run check
```

## Quick test

Evaluate an allowed request:

```bash
npx oasg evaluate \
  --policy examples/policy.base-usdc.json \
  --request examples/request.allow.json
```

Exercise all three outcomes:

```bash
npx oasg evaluate -p examples/policy.base-usdc.json -r examples/request.allow.json
npx oasg evaluate -p examples/policy.base-usdc.json -r examples/request.approval.json
npx oasg evaluate -p examples/policy.base-usdc.json -r examples/request.block.json
```

Create a replayable evidence package:

```bash
npx oasg evaluate \
  --policy examples/policy.base-usdc.json \
  --request examples/request.allow.json \
  --evidence
```

## Normalize x402 v2

OASG accepts the current x402 v2 `PaymentRequired` envelope and one selected item from its `accepts` array. The observation time is explicit so normalization stays reproducible.

```bash
npx oasg normalize-x402 \
  --input examples/x402.payment-required.json \
  --agent research-agent-01 \
  --observed-at 2026-07-10T18:00:00Z
```

v0.1 supports the `exact` scheme. EVM token addresses become CAIP-19-compatible IDs such as `eip155:8453/erc20:0x...`. Other x402 schemes fail closed.

## Normalize a Safe transaction

The Safe adapter consumes a read-only Safe Transaction Service multisig transaction. The caller supplies the chain and native asset ID because a transaction response alone is not sufficient to infer them safely.

```bash
npx oasg normalize-safe \
  --input examples/safe.native-transfer.json \
  --agent treasury-agent-01 \
  --chain eip155:8453 \
  --asset eip155:8453/slip44:60
```

v0.1 accepts only native-value `CALL` transactions with empty calldata and no Safe gas-refund configuration. Delegate calls, calldata, and gas refunds are rejected because they can move value outside the normalized native transfer.

## Library API

```ts
import {
  createEvidencePackage,
  evaluate,
  normalizeX402PaymentRequired,
} from 'open-agent-spend-guard';

const request = normalizeX402PaymentRequired(paymentRequired, {
  agentId: 'research-agent-01',
  observedAt: '2026-07-10T18:00:00Z',
  spentInPeriod: '250000000',
});

const decision = evaluate(policy, request);
const evidence = createEvidencePackage(policy, request);
```

## Policy model

Amounts are non-negative integer strings in an asset's atomic units. For USDC with six decimals, `200000000` means 200 USDC. Decimal strings, scientific notation, negatives, and leading zeros are rejected.

```json
{
  "schemaVersion": "oasg.policy.v1",
  "policyId": "base-ops-usdc",
  "version": 1,
  "rules": {
    "allowedChains": ["eip155:8453"],
    "assets": [
      {
        "assetId": "eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        "maxPerTransaction": "500000000",
        "approvalRequiredAbove": "200000000",
        "periodBudget": { "period": "day", "limit": "1000000000" }
      }
    ],
    "allowedCounterparties": ["0x1111111111111111111111111111111111111111"],
    "allowedPurposes": ["x402_resource_payment"]
  }
}
```

Rules use a fixed precedence so the same valid inputs always produce the same primary reason:

1. allowed chain
2. asset-to-chain consistency
3. allowed asset
4. allowed counterparty
5. allowed purpose
6. per-transaction maximum
7. projected period budget
8. human-approval threshold
9. allow

## Trust boundaries

- OASG evaluates data; it does not prove that source data is authentic.
- Policy distribution, policy rollback protection, and authorization are caller responsibilities.
- `spentInPeriod` is a caller-supplied snapshot, not an internal ledger. A policy with a period budget blocks when that snapshot is missing.
- `evaluatedAt` is a deterministic copy of the caller-supplied `request.observedAt`; it is not a trusted record of when the evaluator process ran.
- Hashes bind the exact JSON value. Normalize timestamps to one UTC representation before evaluation when equivalent instants must produce byte-for-byte identical evidence across systems.
- Hashes use RFC 8785 JSON Canonicalization Scheme serialization to make evidence reproducible; they are not signatures or timestamps from a trusted authority.
- A downstream wallet or payment client must enforce the result immediately and prevent time-of-check/time-of-use substitution.
- No private key, seed phrase, signature, or RPC write endpoint is required or accepted.

Read [THREAT_MODEL.md](THREAT_MODEL.md), [SECURITY.md](SECURITY.md), and [COMPATIBILITY.md](COMPATIBILITY.md) before any production integration.

## Current protocol references

- [x402 v2 specification and SDK](https://github.com/x402-foundation/x402)
- [x402 v1 to v2 migration guide](https://docs.cdp.coinbase.com/x402/migration-guide)
- [Safe API Kit](https://docs.safe.global/reference-sdk-api-kit/overview)
- [Safe Transaction Service](https://docs.safe.global/core-api/api-safe-transaction-service)

These references define the public protocol and source shapes used by the adapters.

## Project status

v0.1.2 is ready for public testing and design-partner feedback. The next validated work is trusted calldata decoding, signed evidence, provider-emitter mappings, and external replay tests. Runtime enforcement remains the responsibility of wallets and control providers.

Maintained by [Onchain On-Call](https://onchainoncall.com/) under the Apache License 2.0.
