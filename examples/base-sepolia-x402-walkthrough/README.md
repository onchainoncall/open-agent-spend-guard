# Base Sepolia x402 evidence walkthrough

This lab starts an official `@x402/express` protected route on localhost, captures the unauthenticated x402 v2 `PAYMENT-REQUIRED` challenge, normalizes it with Open Agent Spend Guard v0.1.2, and writes three portable evidence packages.

## Run

```bash
npm install
npm run run
```

Expected decisions:

- `allow`
- `approval_required`
- `block`

The route uses Base Sepolia (`eip155:84532`) and the public x402 test facilitator. It requests `$0.001` in Base Sepolia USDC. The receiver is an inert demonstration address, so the lab cannot receive funds.

## Scope

This is a real HTTP 402 challenge and policy-evidence capture. It does not sign or settle a payment and does not use a wallet key or test token. A later end-to-end settlement test requires a controlled testnet account and testnet USDC.

Artifacts are written to `artifacts/`:

- `payment-required.json`
- `normalized-request.json`
- `evidence-allow.json`
- `evidence-approval-required.json`
- `evidence-block.json`
- `run-summary.json`

## Primary references

- x402 seller quickstart: https://docs.x402.org/getting-started/quickstart-for-sellers
- x402 network and token support: https://docs.x402.org/core-concepts/network-and-token-support
- Coinbase Developer Platform x402 network support: https://docs.cdp.coinbase.com/x402/network-support
- Open Agent Spend Guard: https://github.com/onchainoncall/open-agent-spend-guard
