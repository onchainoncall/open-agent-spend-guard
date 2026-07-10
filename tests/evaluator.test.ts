import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/index.js';
import { BASE_USDC, PAYEE, basePolicy, baseRequest } from './fixtures.js';

describe('deterministic evaluator', () => {
  it('allows a request inside every rule', () => {
    expect(evaluate(basePolicy(), baseRequest()).outcome).toBe('allow');
  });

  it('returns identical evidence for identical input', () => {
    expect(evaluate(basePolicy(), baseRequest())).toEqual(evaluate(basePolicy(), baseRequest()));
  });

  it('ignores object key insertion order when hashing', () => {
    const request = baseRequest();
    const reordered = Object.fromEntries(Object.entries(request).reverse());
    expect(evaluate(basePolicy(), request).request.hash).toBe(evaluate(basePolicy(), reordered).request.hash);
  });

  it('blocks a disallowed chain before evaluating amount', () => {
    const request = baseRequest();
    request.chainId = 'eip155:1';
    request.amount = '999999999999999999999';
    expect(evaluate(basePolicy(), request).reasonCode).toBe('chain.not_allowed');
  });

  it('blocks an asset whose identifier belongs to another chain', () => {
    const policy = basePolicy();
    policy.rules.allowedChains.push('eip155:1');
    const request = baseRequest();
    request.chainId = 'eip155:1';
    expect(evaluate(policy, request).reasonCode).toBe('asset.chain_mismatch');
  });

  it('blocks an unlisted asset on an allowed chain', () => {
    const request = baseRequest();
    request.assetId = 'eip155:8453/erc20:0x0000000000000000000000000000000000000001';
    expect(evaluate(basePolicy(), request).reasonCode).toBe('asset.not_allowed');
  });

  it('matches EVM counterparties case-insensitively', () => {
    const policy = basePolicy();
    policy.rules.allowedCounterparties = [PAYEE.toUpperCase().replace('0X', '0x')];
    expect(evaluate(policy, baseRequest()).outcome).toBe('allow');
  });

  it('blocks an unlisted counterparty', () => {
    const request = baseRequest();
    request.counterparty = '0x3333333333333333333333333333333333333333';
    expect(evaluate(basePolicy(), request).reasonCode).toBe('counterparty.not_allowed');
  });

  it('allows any counterparty when no allowlist is configured', () => {
    const policy = basePolicy();
    delete policy.rules.allowedCounterparties;
    const request = baseRequest();
    request.counterparty = 'https://merchant.example';
    expect(evaluate(policy, request).outcome).toBe('allow');
  });

  it('blocks an unlisted purpose', () => {
    const request = baseRequest();
    request.purpose = 'treasury_rebalance';
    expect(evaluate(basePolicy(), request).reasonCode).toBe('purpose.not_allowed');
  });

  it('allows any purpose when no purpose allowlist is configured', () => {
    const policy = basePolicy();
    delete policy.rules.allowedPurposes;
    const request = baseRequest();
    request.purpose = 'treasury_rebalance';
    expect(evaluate(policy, request).outcome).toBe('allow');
  });

  it('allows an amount exactly at the approval threshold', () => {
    const request = baseRequest();
    request.amount = '200000000';
    expect(evaluate(basePolicy(), request).outcome).toBe('allow');
  });

  it('requires approval one atomic unit above the threshold', () => {
    const request = baseRequest();
    request.amount = '200000001';
    const decision = evaluate(basePolicy(), request);
    expect(decision.outcome).toBe('approval_required');
    expect(decision.reasonCode).toBe('approval.threshold');
  });

  it('blocks one atomic unit above the transaction maximum', () => {
    const request = baseRequest();
    request.amount = '500000001';
    expect(evaluate(basePolicy(), request).reasonCode).toBe('amount.max_transaction');
  });

  it('allows projected period spend exactly at the budget', () => {
    const request = baseRequest();
    request.amount = '200000000';
    request.spentInPeriod = '800000000';
    const decision = evaluate(basePolicy(), request);
    expect(decision.outcome).toBe('allow');
    expect(decision.facts.projectedPeriodSpend).toBe('1000000000');
  });

  it('blocks projected period spend one unit above budget', () => {
    const request = baseRequest();
    request.amount = '200000000';
    request.spentInPeriod = '800000001';
    expect(evaluate(basePolicy(), request).reasonCode).toBe('budget.period_limit');
  });

  it('blocks when a period budget has no current spend snapshot', () => {
    const request = baseRequest();
    delete request.spentInPeriod;
    expect(evaluate(basePolicy(), request).reasonCode).toBe('budget.snapshot_required');
  });

  it('handles amounts beyond JavaScript safe integers without rounding', () => {
    const policy = basePolicy();
    policy.rules.assets[0]!.maxPerTransaction = '999999999999999999999999999999';
    policy.rules.assets[0]!.approvalRequiredAbove = '999999999999999999999999999998';
    delete policy.rules.assets[0]!.periodBudget;
    const request = baseRequest();
    request.amount = '999999999999999999999999999999';
    expect(evaluate(policy, request).outcome).toBe('approval_required');
  });

  it('uses the matching asset index in evidence', () => {
    const policy = basePolicy();
    policy.rules.assets.unshift({
      assetId: 'eip155:8453/slip44:60',
      maxPerTransaction: '1000000000000000000',
    });
    const request = baseRequest();
    request.amount = '500000001';
    expect(evaluate(policy, request).matchedRule).toBe('/rules/assets/1/maxPerTransaction');
  });

  it('changes the policy hash and decision id when policy version changes', () => {
    const first = evaluate(basePolicy(), baseRequest());
    const policy = basePolicy();
    policy.version = 2;
    const second = evaluate(policy, baseRequest());
    expect(second.policy.hash).not.toBe(first.policy.hash);
    expect(second.decisionId).not.toBe(first.decisionId);
  });

  it('uses the request observation time instead of the wall clock', () => {
    const request = baseRequest();
    request.observedAt = '2025-01-02T03:04:05Z';
    expect(evaluate(basePolicy(), request).evaluatedAt).toBe('2025-01-02T03:04:05Z');
  });

  it('preserves the evaluated asset identifier in the facts', () => {
    expect(evaluate(basePolicy(), baseRequest()).facts.assetId).toBe(BASE_USDC);
  });
});
