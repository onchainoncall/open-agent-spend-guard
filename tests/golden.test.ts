import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canonicalJson, createEvidencePackage, evaluate, sha256 } from '../src/index.js';

const readJson = (path: string): any => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const policy = readJson('examples/policy.base-usdc.json');
const vectors = readJson('examples/golden-vectors.json');

describe('committed cross-runtime golden vectors', () => {
  it('matches the RFC 8785 canonical key-order vector', () => {
    expect(canonicalJson(vectors.canonicalization.input)).toBe(vectors.canonicalization.canonical);
    expect(sha256(vectors.canonicalization.input)).toBe(vectors.canonicalization.sha256);
  });

  it('matches the RFC 8785 number-serialization vector', () => {
    const value = { numbers: vectors.numberSerialization.numbers };
    expect(canonicalJson(value)).toBe(vectors.numberSerialization.canonical);
    expect(sha256(value)).toBe(vectors.numberSerialization.sha256);
  });

  it.each([
    ['lone high surrogate', { value: '\ud800' }],
    ['lone low surrogate', { value: '\udfff' }],
    ['undefined', { value: undefined }],
    ['non-finite number', { value: Number.POSITIVE_INFINITY }],
    ['non-plain object', { value: new Date('2026-07-10T00:00:00Z') }],
  ])('rejects non-I-JSON input: %s', (_label, value) => {
    expect(() => canonicalJson(value)).toThrow(/canonical|Unicode|Non-|finite/i);
  });

  it('rejects sparse arrays', () => {
    const value = new Array(2);
    value[1] = 'present';
    expect(() => canonicalJson(value)).toThrow(/Sparse array/);
  });

  it.each(['allow', 'approval', 'block'])('matches the %s decision vector', (name) => {
    const request = readJson(`examples/request.${name}.json`);
    const decision = evaluate(policy, request);
    const evidence = createEvidencePackage(policy, request);
    expect(decision.policy.hash).toBe(vectors.policyHash);
    expect(decision.request.hash).toBe(vectors.evaluations[name].requestHash);
    expect(decision.decisionId).toBe(vectors.evaluations[name].decisionId);
    expect(evidence.packageId).toBe(vectors.evaluations[name].packageId);
  });
});
