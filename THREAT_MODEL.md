# Threat Model

Status: v0.1.0, unaudited reference implementation.

## Security objective

Given an authenticated policy and a correctly normalized request, produce a deterministic policy outcome and a reproducible evidence record without handling private keys or writing transactions.

## Protected properties

- Decision integrity: the reported outcome follows the documented rule order.
- Arithmetic integrity: token amounts are compared without floating-point rounding.
- Evidence reproducibility: identical JSON values produce identical hashes and IDs.
- Fail-closed adapter behavior: unsupported payment shapes do not silently become allowed requests.
- Secret minimization: the library does not require wallet secrets or production write credentials.

## Trust assumptions

The caller is responsible for authenticating the active policy, preventing policy rollback, verifying source provenance, supplying a current period-spend snapshot, and enforcing the decision against the exact request that was evaluated.

OASG does not establish chain finality, token decimals, contract semantics, Safe ownership, x402 facilitator integrity, or the identity behind a counterparty string.

## Threats and controls

| Threat | v0.1 control | Residual risk |
|---|---|---|
| Floating-point rounding | Atomic integer strings and `bigint` comparisons | Caller can use the wrong decimals or asset ID |
| Integer overflow | Arbitrary-precision `bigint` | Inputs are capped to 78 decimal digits by schema |
| Chain/asset confusion | CAIP-2 chain IDs and asset-to-chain consistency check | Asset metadata is not fetched or verified |
| EVM address casing mismatch | EVM counterparties and assets normalize to lowercase | Non-EVM identifiers remain case-sensitive |
| Malformed or extended JSON | Strict schemas and `additionalProperties: false` | A valid but dishonest source remains possible |
| Unsupported x402 behavior | v2 plus `exact` only; other schemes fail closed | Protocol changes require compatibility review |
| Arbitrary Safe call effects | Delegate calls, non-empty calldata, and gas-refund configuration fail closed | Native transfers can still target contracts |
| Missing or stale daily spend | Missing snapshots block; projected spend is explicit in evidence | Caller snapshots can still be stale; OASG has no authoritative ledger |
| Time-of-check/time-of-use swap | Request hash binds the evaluated request | Downstream enforcement must compare that hash |
| Policy rollback | Policy version and hash are recorded | Version monotonicity is external to OASG |
| Evidence tampering | Canonical SHA-256 hashes | Hashes are not signatures or trusted timestamps |
| Replay | Stable request and decision IDs aid detection | Replay storage and idempotency are external |
| Dependency compromise | Lockfile, minimal runtime dependencies, CI audit | Supply-chain risk is not eliminated |
| Sensitive data disclosure | No secrets required; schemas constrain metadata | Policies and evidence may still be confidential |

## Deliberate exclusions

- Private-key storage, transaction signing, custody, settlement, and recovery
- Smart-contract auditing or malicious-contract detection
- ERC-20 calldata decoding and arbitrary contract-effect simulation
- Trusted token metadata and price conversion
- Stateful budget accounting
- Approval identity, authentication, or quorum enforcement
- Remote policy distribution and rollback protection
- Guaranteed detection, prevention, or fund safety

## Safe production pattern

1. Authenticate a policy from a controlled source and enforce monotonic versions.
2. Normalize a payment request from a verified source.
3. Evaluate immediately before signing or submission.
4. Bind downstream enforcement to the request hash and decision ID.
5. Atomically reserve period budget before allowing concurrent spend.
6. Record the evidence package in an access-controlled, append-only system.
7. Revalidate after any material request change or approval delay.

## Review priorities

External reviewers should focus first on schema bypasses, normalization ambiguity, reason precedence, `bigint` boundaries, canonicalization consistency, TOCTOU integration mistakes, and unsafe assumptions around period spend.
