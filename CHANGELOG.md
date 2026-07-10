# Changelog

All notable changes are documented here.

## 0.1.1 - 2026-07-10

- Added semantic policy checks to the validation API and CLI.
- Required native `slip44` CAIP-19 assets for Safe native-value transfers.
- Scoped x402 exact-scheme validation to the selected payment option.
- Documented deterministic timestamp provenance and UTC normalization expectations.
- Expanded the release suite to 102 automated tests.

## 0.1.0 - 2026-07-10

- Added versioned policy, request, decision, and evidence-package schemas.
- Added deterministic policy evaluation with atomic integer arithmetic.
- Added chain, asset, counterparty, purpose, transaction, approval, and daily-budget rules.
- Added x402 v2 `exact` PaymentRequired adapter.
- Added read-only Safe native-transfer adapter with fail-closed calldata handling.
- Added CLI normalization, evaluation, validation, canonical hash, and evidence commands.
- Added 98 automated tests, including adapter contracts, golden vectors, CLI tests, and adversarial cases.
- Added CI, threat model, compatibility statement, design-partner protocol, and examples.
