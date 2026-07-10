# Contributing

Contributions are welcome during the v0.1 design-partner phase.

## Before opening a change

Use an issue to describe the payment shape, threat being addressed, expected policy behavior, and why an existing rule or adapter is insufficient. Do not include production secrets or customer transaction data.

## Development

```bash
npm ci
npm run check
```

Changes to behavior must include boundary and malformed-input tests. Changes to a public document shape require a new schema version or a backward-compatible rationale. Adapters must fail closed when source semantics cannot be represented safely.

Keep provider-specific behavior in adapters and keep the evaluator provider-neutral. Do not add signing, custody, or write-side network behavior without a separate threat-model review.
