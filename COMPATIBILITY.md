# Compatibility

Compatibility snapshot: July 10, 2026.

## Runtime

- Node.js 20 or newer
- ESM package output
- CI targets Node.js 20, 22, and 24

## x402

Tested source shape: x402 v2 `PaymentRequired`, compatible with `@x402/core` 2.18.0.

Supported:

- `x402Version: 2`
- `resource` plus non-empty `accepts`
- `exact` payment scheme
- scheme-specific validation of the selected payment option; unselected options remain bound by the source hash
- CAIP-2 network identifiers
- EVM ERC-20 addresses and portable non-EVM token identifiers

Not supported in v0.1:

- x402 v1
- `upto`, `batch-settlement`, or custom schemes
- payment signing, facilitator verification, or settlement
- extension semantics beyond preserving the source hash

## Safe

Tested source shape: Safe API Kit 5.0.1 / Safe Transaction Service multisig transaction response.

Supported:

- `operation: 0` (`CALL`)
- native-value transfers
- caller-supplied native CAIP-19 asset IDs in the `slip44` namespace
- empty or `0x` calldata
- zero gas price, zero gas token, and zero or absent refund receiver
- pending or executed response metadata as evidence

Not supported in v0.1:

- delegate calls
- Safe gas-refund configuration
- ERC-20, ERC-721, ERC-1155, multisend, or arbitrary calldata decoding
- proposing, confirming, signing, or executing a Safe transaction
- inferring chain or native asset identity from a transaction response

## Compatibility policy

Adapter compatibility is pinned by tests and reviewed before each release. New upstream fields are rejected when they enter an OASG schema unless the adapter explicitly maps them.
