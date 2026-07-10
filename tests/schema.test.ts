import { describe, expect, it } from 'vitest';
import { assertPolicy, assertRequest, createEvidencePackage, evaluate, validationResult } from '../src/index.js';
import { basePolicy, baseRequest } from './fixtures.js';

describe('versioned schemas and semantic policy checks', () => {
  it('accepts the reference policy', () => expect(validationResult('policy', basePolicy()).valid).toBe(true));
  it('accepts the reference request', () => expect(validationResult('request', baseRequest()).valid).toBe(true));
  it('accepts an evaluator-produced decision', () => {
    expect(validationResult('decision', evaluate(basePolicy(), baseRequest())).valid).toBe(true);
  });
  it('accepts a complete evidence package', () => {
    expect(validationResult('evidence', createEvidencePackage(basePolicy(), baseRequest())).valid).toBe(true);
  });
  it('creates evidence deterministically', () => {
    expect(createEvidencePackage(basePolicy(), baseRequest())).toEqual(createEvidencePackage(basePolicy(), baseRequest()));
  });

  it.each([
    ['wrong schema version', (value: Record<string, unknown>) => (value.schemaVersion = 'oasg.policy.v2')],
    ['version zero', (value: Record<string, unknown>) => (value.version = 0)],
    ['unknown property', (value: Record<string, unknown>) => (value.unknown = true)],
  ])('rejects a policy with %s', (_label, mutate) => {
    const policy = structuredClone(basePolicy()) as unknown as Record<string, unknown>;
    mutate(policy);
    expect(() => assertPolicy(policy)).toThrow();
  });

  it('rejects duplicate allowed chains', () => {
    const policy = basePolicy();
    policy.rules.allowedChains.push('eip155:8453');
    expect(() => assertPolicy(policy)).toThrow();
  });

  it('rejects duplicate asset rules', () => {
    const policy = basePolicy();
    policy.rules.assets.push(structuredClone(policy.rules.assets[0]!));
    expect(() => assertPolicy(policy)).toThrow(/Invalid policy/);
  });

  it('rejects an asset rule outside allowed chains', () => {
    const policy = basePolicy();
    policy.rules.assets[0]!.assetId = 'eip155:1/slip44:60';
    expect(() => assertPolicy(policy)).toThrow(/Invalid policy/);
  });

  it('rejects an approval threshold above the transaction maximum', () => {
    const policy = basePolicy();
    policy.rules.assets[0]!.approvalRequiredAbove = '500000001';
    expect(() => assertPolicy(policy)).toThrow(/Invalid policy/);
  });

  it.each([
    ['decimal amount', '1.5'],
    ['negative amount', '-1'],
    ['leading zero', '01'],
    ['scientific notation', '1e6'],
    ['empty amount', ''],
  ])('rejects a request with %s', (_label, amount) => {
    const request = baseRequest();
    request.amount = amount;
    expect(() => assertRequest(request)).toThrow();
  });

  it('rejects a malformed observation timestamp', () => {
    const request = baseRequest();
    request.observedAt = 'tomorrow';
    expect(() => assertRequest(request)).toThrow();
  });

  it('rejects undeclared request fields', () => {
    const request = { ...baseRequest(), privateKey: 'never' };
    expect(() => assertRequest(request)).toThrow();
  });

  it('rejects object values in source metadata', () => {
    const request = baseRequest() as unknown as Record<string, unknown>;
    request.source = { type: 'test', metadata: { nested: { unsafe: true } } };
    expect(() => assertRequest(request)).toThrow();
  });

  it('accepts primitive source metadata values', () => {
    const request = baseRequest();
    request.source = { type: 'test', metadata: { count: 2, verified: true, note: null } };
    expect(() => assertRequest(request)).not.toThrow();
  });
});
