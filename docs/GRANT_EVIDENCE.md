# Grant Evidence Index

Release target: v0.1.0.

Public package: `https://onchainoncall.com/downloads/open-agent-spend-guard-0.1.0.tgz`

Public source archive: `https://onchainoncall.com/downloads/open-agent-spend-guard-source-v0.1.0.zip`

## Shipped public-good artifacts

- Provider-neutral policy, request, decision, and evidence-package schemas
- Deterministic reference evaluator with fixed reason precedence
- x402 v2 `exact` PaymentRequired adapter with Base example
- Read-only Safe native-transfer adapter
- CLI and TypeScript API
- 98 automated boundary, malformed-input, adapter-contract, CLI, golden-vector, and adversarial tests
- Node.js 20, 22, and 24 CI
- Threat model, security policy, compatibility statement, and design-partner test
- Apache-2.0 source license

## Reproduction

```bash
npm ci
npm run check
npx oasg evaluate \
  --policy examples/policy.base-usdc.json \
  --request examples/request.allow.json \
  --evidence
```

## Current limitations

The release is unaudited and does not sign, settle, custody, decode arbitrary calldata, verify source authenticity, or maintain an authoritative budget ledger. These limits are explicit and fail closed where an adapter cannot represent effects safely.

## Next measurable milestones

1. Complete three qualified design-partner tests using the published protocol.
2. Publish anonymized findings and resolve high-severity usability or trust-boundary gaps.
3. Add a Base Sepolia x402 walkthrough without requiring production funds.
4. Obtain an independent security review of schemas, normalization, and evaluator behavior.
5. Propose only validated provider-emitter mappings after the review.
