# Changelog

All notable changes are documented here.

## 0.1.0 - 2026-07-10

- Added versioned policy, request, decision, and evidence-package schemas.
- Added deterministic policy evaluation with atomic integer arithmetic.
- Added chain, asset, counterparty, purpose, transaction, approval, and daily-budget rules.
- Added x402 v2 `exact` PaymentRequired adapter.
- Added read-only Safe native-transfer adapter with fail-closed calldata handling.
- Added CLI normalization, evaluation, validation, canonical hash, and evidence commands.
- Added 98 automated tests, including adapter contracts, golden vectors, CLI tests, and adversarial cases.
- Added CI, threat model, compatibility statement, design-partner protocol, and examples.
