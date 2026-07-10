# v0.1.0 Pre-Release Review Record

Date: July 10, 2026.

This record documents an automated second-model review by Claude Fable plus local verification by Codex. It is not an independent human security audit.

## Initial findings

The first review identified three release blockers:

1. Locale-dependent object-key sorting weakened cross-runtime evidence hashes.
2. The Safe adapter did not reject gas-refund fields that could move value outside the normalized transfer amount.
3. The documented repository and release tag had not yet been published.

It also recommended an upstream x402 contract test, EVM payee validation, fail-closed period snapshots, CLI end-to-end tests, and committed golden vectors.

## Remediation

- Replaced local sorting with exact-pinned RFC 8785 canonicalization.
- Added strict I-JSON checks for lone surrogates, sparse arrays, non-finite numbers, unsupported values, circular references, and non-plain objects.
- Added key-order and number-serialization golden vectors plus stable policy, request, decision, and evidence IDs.
- Rejected Safe delegate calls, calldata, nonzero gas price, nonzero gas token, and nonzero refund receiver.
- Contract-tested the x402 fixture against `@x402/core` 2.18.0 and rejected malformed EVM assets and payees.
- Changed period budgets to block when the current spend snapshot is missing.
- Added packaged CLI tests over every bundled example and error/stdin paths.
- Added tarball-install and tagged-GitHub-install CI jobs.

## Post-remediation verdict

Claude Fable's focused second review found no remaining Critical or High code defects and returned `SHIP`, conditional on publishing the repository, passing remote CI, tagging v0.1.0, and passing the tagged-install job.

## Local release gate

- TypeScript strict typecheck: passed
- Automated tests: 98 passed across 6 files
- Production build: passed
- Package dry run and content inspection: passed
- npm audit: 0 vulnerabilities

An independent human security review remains a planned next milestone before production evidence emitters are proposed.

## Publication closure

The repository was published at `https://github.com/onchainoncall/open-agent-spend-guard`. The v0.1.2 publication release retains the remediated behavior and adds canonical GitHub metadata plus repeatable remote CI triggering.
